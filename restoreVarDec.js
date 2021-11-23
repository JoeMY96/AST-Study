const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const generate = require('@babel/generator').default;
const types = require('@babel/types')
const fs = require('fs');

const sourceCode = fs.readFileSync('./source_code.js', {encoding: "utf-8"});

const ast = parser.parse(sourceCode);


/*
如果后续引用前面定义的常量，且没有进行过更改，则将后面的变量名直接替换成常量值
*/
const restoreVarDeclator = {
    VariableDeclarator(path) {
        let {id, init} = path.node;
        if (!types.isIdentifier(id)){
            return
        }

        let initPath = path.get('init');
        if (initPath.isUnaryExpression({operator: '+'}) || initPath.isUnaryExpression({operator: '-'})){
            if (!types.isLiteral(init.argument)){
                return
            }
        } else if (!initPath.isLiteral() && !initPath.isIdentifier()) {
            return
        }

        const binding = path.scope.getBinding(id.name);

        // 判断初始值是否被修改
        if (!binding || !binding.constant) return;

        // 获取所有引用的地方并替换
        let referPaths = binding.referencePaths;
        for (let referPath of referPaths) {
            referPath.replaceWith(init);
        }

        // 替换完毕，删除原节点
        path.remove();

    }

}

/*************************************************************************/


/*
处理十六进制、中英文Unicode字符串或数值，替换为正常的数字和字符串
*/
const transform_literal = {
    NumericLiteral({node}) {
      if (node.extra && /^0[obx]/i.test(node.extra.raw)) {
        node.extra = undefined;
      }
    },
    StringLiteral({node}) 
    {
      if (node.extra && /\\[ux]/gi.test(node.extra.raw)) {
        node.extra = undefined;
      }
    },
  }

/*************************************************************************/

/*
将对象点取值改为字符串取值 a.b ==> a['b']
*/
const member_property_literals = {
    MemberExpression:
    {
      exit({node}) {
        const prop = node.property;
        if (!node.computed && types.isIdentifier(prop)) {
          node.property = types.StringLiteral(prop.name);
          node.computed = true;
        }
      }
    },  
    ObjectProperty: 
    {
      exit({node}) {
        const key = node.key;
        if (!node.computed && types.isIdentifier(key)) {
          node.key = types.StringLiteral(key.name);
        }
      }
    },  
  }


/*************************************************************************/
/*
优化无实参的自执行函数，将自执行函数内的逻辑拿到外面，去掉自执行代码块
*/
const simplify_auto_exec = {
    UnaryExpression(path) {
      let {operator,argument} = path.node;
      // 如果符号不是！，或argument不是CallExpression，跳过
      if (operator != "!" || !types.isCallExpression(argument)) return;

      let {arguments,callee} = argument;
      // 如果自执行函数调用时传入了实参，跳过
      if (arguments.length !=0 || !types.isFunctionExpression(callee)) return;
      
      let {id,params,body} = callee;
      // 如果自执行函数定义了形参，跳过
      if (id != null || params.length !=0 || !types.isBlockStatement(body)) return;

      path.replaceWithMultiple(body.body);
    }
  }


/*************************************************************************/

/*
****************全局函数计算值替换****************
如：
  处理前：
    var a = parseInt("12345",16),b = Number("123"),c = String(true),d = unescape("hello%2CAST%21");
    eval("a = 1");
  处理后：
    var a = 74565,b = 123,c = "true",d = "hello,AST!";
    eval("a = 1");

思路：
  1、CallExpression表达式的callee节点必须是Identifier类型。

  2、函数名不能是eval，因为eval函数无返回值，无法进行替换。

  3、判断global[funcname]的类型，如果是"function"，则表示它是全局函数。

  4、获取实参，计算结果。

  5、计算出来的结果不能是function类型，不能进行替换。

  6、构造节点，进行替换即可。
*/
const evaluate_global_func = {
    "CallExpression"(path) {
      let {callee,arguments} = path.node;
      // eval函数无返回值，无法进行替换
      if (!types.isIdentifier(callee) || callee.name == "eval") return; 
      // 如果参数不是Literal类型，跳过
      if (!arguments.every(arg=>types.isLiteral(arg))) return;
      
      // 判断global[funcname]的类型，如果是"function"，则表示它是全局函数
      let func = global[callee.name];
      if (typeof func !== "function") return;
      
      // 把参数存入一个数组中，下面用apply进行调用
      let args = [];
      arguments.forEach((ele,index) =>{args[index] = ele.value;});
      
      let value = func.apply(null,args);
      // 如果返回值是function，跳过
      if (typeof value == "function") return;
      path.replaceInline(types.valueToNode(value));
    }
  }


/*************************************************************************/

/*
删除空行
*/
const removeEmptyState = {
    EmptyStatement(path)
    {
        path.remove();
    },
}

/*************************************************************************/

/*
****************专用插件编写*****************
还原前：
  for (var e = "\u0270\u026D\u0274\u0274\u0277\u0234\u0249\u025B\u025C\u0229", a = "", s = 0; s < e.length; s++) {
    var r = e.charCodeAt(s) - 520;
    a += String.fromCharCode(r);
  }

还原后：
  var a = "hello,AST!";
*/
const for_to_string = {
  ForStatement(path) {
      let body = path.get("body.body");

      if (!body || body.length !== 2)
          return;
      if (!body[0].isVariableDeclaration() || !body[1].isExpressionStatement()) {
          return;
      }

      let body0_code = body[0].toString();
      let body1_code = body[1].toString();

      if (body0_code.indexOf("charCodeAt") != -1 && body1_code.indexOf("String.fromCharCode") != -1) {
          try {
              let expression = body[1].node.expression;
              let name = expression.left.name;
              
              // 把原代码封装成一个function，手动添加return语句，拿到返回的结果
              let code = path.toString() + "\nreturn " + name;
              let func = new Function("",code);
              let value = func();

              let new_node = types.VariableDeclaration("var", [types.VariableDeclarator(types.Identifier(name), types.valueToNode(value))]);
              path.replaceWith(new_node);
          } catch (e) {};
      }
  }
}

traverse(ast, for_to_string);

const {code} = generate(ast);

fs.writeFile('decode.js', code, (err)=>{});