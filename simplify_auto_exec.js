const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const generate = require('@babel/generator').default;
const types = require('@babel/types')
const fs = require('fs');

const sourceCode = fs.readFileSync('./source_code.js', {encoding: "utf-8"});

const ast = parser.parse(sourceCode);



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



traverse(ast, simplify_auto_exec);

const {code} = generate(ast);

fs.writeFile('decode.js', code, (err)=>{});