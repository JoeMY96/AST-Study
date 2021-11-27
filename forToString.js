const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const generate = require('@babel/generator').default;
const types = require('@babel/types')
const fs = require('fs');

const sourceCode = fs.readFileSync('./sourceCode.js', {encoding: "utf-8"});

const ast = parser.parse(sourceCode);



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