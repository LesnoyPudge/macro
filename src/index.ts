/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable import-x/no-extraneous-dependencies */
import * as Macro from 'babel-plugin-macros';
import * as Traverse from '@babel/traverse';
import * as t from '@babel/types';
import * as Generator from '@babel/generator';
import type { T } from '@lesnoypudge/types-utils-base/namespace';



const defaultMessage = 'Invariant failed';

// const astToCode = (
//     Generator.default as any
// ).default as typeof Generator.default;
const createMacro = Macro.default.createMacro;
const MacroError = Macro.default.MacroError;


// eslint-disable-next-line prefer-arrow/prefer-arrow-functions
function invariant(
    condition: any,
    message = defaultMessage,
): asserts condition {
    if (condition) return;

    throw new MacroError(message);
};


// const looksLike = (a: any, b: any): boolean => {
//     return (
//         a
//         && b
//         && Object.keys(b).every((bKey) => {
//             const bVal = b[bKey];
//             const aVal = a[bKey];
//             if (typeof bVal === 'function') {
//                 return bVal(aVal);
//             }
//             return isPrimitive(bVal) ? bVal === aVal : looksLike(aVal, bVal);
//         })
//     );
// };

// const isPrimitive = (val: any) => {
//     return val == null || /^[bns]/.test(typeof val);
// };

const getDecoratorTarget = (currentExpression: Traverse.NodePath) => {
    const blockOrProgram = currentExpression.parent;
    const isParentBlockOrProgram = (
        t.isProgram(blockOrProgram)
        || t.isBlock(blockOrProgram)
    );
    invariant(
        isParentBlockOrProgram,
        'Decorator should be inside block or program',
    );

    const currentExpressionIndex = blockOrProgram.body.findIndex((node) => {
        return node === currentExpression.node;
    });
    invariant(currentExpressionIndex !== -1, 'Expression not found');

    const sliceToFindFrom = blockOrProgram.body.slice(
        currentExpressionIndex + 1,
    );

    const functionToWrap = sliceToFindFrom.map((node) => {
        if (t.isVariableDeclaration(node)) return node;

        if ((
            t.isExportNamedDeclaration(node)
            && t.isVariableDeclaration(node.declaration)
        )) return node.declaration;

        return;
    }).find(Boolean);
    invariant(functionToWrap, 'Can not find function to decorate');

    invariant(functionToWrap.declarations.length <= 1,
        'One declaration should contain one declarator',
    );
    const declarator = functionToWrap.declarations.at(0);
    invariant(declarator);

    const functionBody = declarator.init;
    const isFunctionBody = (
        t.isArrowFunctionExpression(functionBody)
        || t.isCallExpression(functionBody)
    );
    invariant(isFunctionBody);

    return {
        functionBody,
        functionDeclarator: declarator,
    };
};

const findCurrentExpression = (
    refPath: Traverse.NodePath,
) => {
    const currentExpression = refPath.findParent((path) => {
        return t.isExpressionStatement(path.node);
    });
    invariant(currentExpression, 'ExpressionStatement not found');
    invariant(t.isExpressionStatement(currentExpression.node));

    return currentExpression as Traverse.NodePath<t.ExpressionStatement>;
};

const isDecorateCall = (refPath: Traverse.NodePath) => {
    if (!t.isIdentifier(refPath.node)) return false;
    if (!t.isCallExpression(refPath.parent)) return false;
    if (refPath.node.name !== 'decorate') return false;

    return true;
};

const isDecorateTarget = (node: Traverse.Node) => {
    if (!t.isMemberExpression(node)) return false;
    if (!t.isIdentifier(node.object)) return false;
    if (node.object.name !== 'decorate') return false;
    if (!t.isIdentifier(node.property)) return false;
    if (node.property.name !== 'target') return false;

    return true;
};

export default createMacro(({
    references,
    babel,
    source,
    state,
}) => {
    const { decorate } = references;
    invariant(decorate);

    decorate.toReversed().forEach((refPath) => {
        if (!isDecorateCall(refPath)) return;

        const currentExpression = findCurrentExpression(refPath);
        const decoratorTarget = getDecoratorTarget(currentExpression);

        // console.log(astToCode(currentExpression.node).code);
        // console.log(astToCode(decoratorTarget.functionBody).code);

        invariant(t.isCallExpression(currentExpression.node.expression));
        invariant(t.isIdentifier(currentExpression.node.expression.callee));

        const args = currentExpression.node.expression.arguments;
        invariant(args.length > 1);

        const decorator = args[0];
        invariant(t.isIdentifier(decorator));

        const restArgs = args.slice(1);

        const decorated = t.callExpression(
            t.identifier(decorator.name),
            restArgs.map((node) => {
                if (!isDecorateTarget(node)) return node;

                return decoratorTarget.functionBody;
            }),
        );

        // console.log(astToCode(decorated).code);

        decoratorTarget.functionDeclarator.init = decorated;

        invariant(refPath.parentPath);
        refPath.parentPath.remove();
    });
});

export const decorate = {} as {
    <
        _Decorator extends T.AnyFunction,
    >(
        decorator: _Decorator,
        ...args: Parameters<_Decorator>
    ): void;
    target: T.AnyFunction;
};