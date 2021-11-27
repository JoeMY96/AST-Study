const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const generate = require('@babel/generator').default;
const types = require('@babel/types')
const fs = require('fs');

const sourceCode = fs.readFileSync('./sourceCode.js', {encoding: "utf-8"});

const ast = parser.parse(sourceCode);

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



traverse(ast, removeEmptyState);

const {code} = generate(ast);

fs.writeFile('decode.js', code, (err)=>{});