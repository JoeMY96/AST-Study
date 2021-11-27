const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const generate = require('@babel/generator').default;
const types = require('@babel/types')

const sourceCode = `
        var Xor = function(p, q) {
            return p ^ q;
        }
        let a = Xor(111, 222)
`

const ast = parser.parse(sourceCode);

/*************************************************************************/

const restoreCallExpression = {
    VariableDeclarator(path) {
        const init = path.get('init');
        if (init.isFunctionExpression()) {
            call2express(path);
            return
        }
    }
}

function call2express(path) {
    // 获取函数名
    const {init, id} = path.node;
    const name = id.name;

    // 获取参数，判断长度
    const params = init.params;
    if (params.length !== 2) return;
    let first_arg = params[0].name;
    let second_arg = params[1].name;

    // 判断函数体长度是否为1
    const body = init.body;
    if (!body.body || body.body.length !== 1) return;

    // 判断ReturnStatement及其参数类型
    let return_body = body.body[0];
    let argument = return_body.argument;
    if (!types.isReturnStatement(return_body) || !types.isBinaryExpression(argument)) {
        return_body
    }

    // 判断函数的参数与return语句的参数是否一致
    let {left, right, operator}= argument;
    if (!types.isIdentifier(left, {name: first_arg}) || 
        !types.isIdentifier(right, {name: second_arg})) {
            return_body
        }

    // 遍历作用域节点，找出所有CallExpression，判断成功后替换
    let scope = path.scope;
    traverse(scope.block, {
        CallExpression(_path) {
            let _node = _path.node;
            let args = _node.arguments;
            if (args.length ==2 && types.isIdentifier(_node.callee, {name:name})) {
                _path.replaceWith(types.binaryExpression(operator, args[0], args[1]))
            }
        }
    })
}
/*************************************************************************/



traverse(ast, restoreCallExpression);

const {code} = generate(ast);

console.log(code);