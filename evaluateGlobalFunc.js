const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const generate = require('@babel/generator').default;
const types = require('@babel/types')
const fs = require('fs');

const sourceCode = fs.readFileSync('./sourceCode.js', {encoding: "utf-8"});

const ast = parser.parse(sourceCode);



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



traverse(ast, evaluate_global_func);

const {code} = generate(ast);

fs.writeFile('decode.js', code, (err)=>{});