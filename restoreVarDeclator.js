const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const generate = require('@babel/generator').default;
const types = require('@babel/types')
const fs = require('fs');

const sourceCode = fs.readFileSync('./sourceCode.js', {encoding: "utf-8"});

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




traverse(ast, restoreVarDeclator);

const {code} = generate(ast);

fs.writeFile('decode.js', code, (err)=>{});