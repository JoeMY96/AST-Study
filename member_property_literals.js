const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const generate = require('@babel/generator').default;
const types = require('@babel/types')
const fs = require('fs');

const sourceCode = fs.readFileSync('./source_code.js', {encoding: "utf-8"});

const ast = parser.parse(sourceCode);




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


traverse(ast, member_property_literals);

const {code} = generate(ast);

fs.writeFile('decode.js', code, (err)=>{});