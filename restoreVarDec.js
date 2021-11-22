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


/*
优化无实参的自执行函数，将自执行函数内的逻辑拿到外面，去掉自执行代码块
*/
const simplify_auto_exec = {
    UnaryExpression(path)
    {
      let {operator,argument} = path.node;
      if (operator != "!" || !types.isCallExpression(argument)) return;

      let {arguments,callee} = argument;
      if (arguments.length !=0 || !types.isFunctionExpression(callee)) return;
      
      let {id,params,body} = callee;
      if (id != null || params.length !=0 || !types.isBlockStatement(body)) return;

      path.replaceWithMultiple(body.body);
    }
  }












traverse(ast, simplify_auto_exec);

const {code} = generate(ast);

fs.writeFile('decode.js', code, (err)=>{});