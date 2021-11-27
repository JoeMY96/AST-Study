const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const generate = require('@babel/generator').default;

const sourceCode = `
var a = 1, b = [1, 2];
const c = 12;
a += 5;
`

const ast = parser.parse(sourceCode);

/*************************************************************************/
/**
 * 删除花指令（即定义后后续没有使用或更改的变量/函数）
 */

const removeJunkCode = {
    "VariableDeclarator|FunctionDeclaration"(path) {
        let {node, scope, parentPath} = path;
        let binding = scope.getBinding(node.id.name);
        
        if (binding && !binding.referenced && binding.constant) {
            if (parentPath.parentPath.isForInStatement()){
                return
            }
            path.remove();
        }
    }
}


/*************************************************************************/



traverse(ast, removeJunkCode);

const {code} = generate(ast);

console.log(code);