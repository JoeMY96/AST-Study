const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const generate = require('@babel/generator').default;
const types = require('@babel/types')
const fs = require('fs');

const sourceCode = fs.readFileSync('./sourceCode.js', {encoding: "utf-8"});

const ast = parser.parse(sourceCode);



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



traverse(ast, transform_literal);

const {code} = generate(ast);

fs.writeFile('decode.js', code, (err)=>{});