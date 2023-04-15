"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var typescript_1 = __importDefault(require("typescript"));
var path_1 = __importDefault(require("path"));
var createObjectLiteral = typescript_1.default.factory ? typescript_1.default.factory.createObjectLiteralExpression : typescript_1.default.createObjectLiteral;
var createPropertyAssignment = typescript_1.default.factory ? typescript_1.default.factory.createPropertyAssignment : typescript_1.default.createPropertyAssignment;
var createStringLiteral = typescript_1.default.factory ? typescript_1.default.factory.createStringLiteral : typescript_1.default.createStringLiteral;
function transformer(program) {
    return function (context) { return function (file) { return visitNodeAndChildren(file, program, context); }; };
}
exports.default = transformer;
function visitNodeAndChildren(node, program, context) {
    return typescript_1.default.visitEachChild(visitNode(node, program), function (childNode) { return visitNodeAndChildren(childNode, program, context); }, context);
}
function visitNode(node, program) {
    var typeChecker = program.getTypeChecker();
    if (isEnumerateImportExpression(node)) {
        return;
    }
    if (!isEnumerateCallExpression(node, typeChecker)) {
        return node;
    }
    var literals = [];
    node.typeArguments && resolveStringLiteralTypes(typeChecker.getTypeFromTypeNode(node.typeArguments[0]), literals);
    return createObjectLiteral(literals.map(function (literal) {
        return createPropertyAssignment(JSON.stringify(literal), createStringLiteral(literal));
    }));
}
var indexJs = path_1.default.join(__dirname, 'index.js');
function isEnumerateImportExpression(node) {
    if (!typescript_1.default.isImportDeclaration(node)) {
        return false;
    }
    var module = node.moduleSpecifier.text;
    try {
        return indexJs === (module.startsWith('.')
            ? require.resolve(path_1.default.resolve(path_1.default.dirname(node.getSourceFile().fileName), module))
            : require.resolve(module));
    }
    catch (e) {
        return false;
    }
}
var indexTs = path_1.default.join(__dirname, 'index.d.ts');
function isEnumerateCallExpression(node, typeChecker) {
    var _a, _b;
    if (!typescript_1.default.isCallExpression(node)) {
        return false;
    }
    var signature = typeChecker.getResolvedSignature(node);
    if (typeof signature === 'undefined') {
        return false;
    }
    var declaration = (_a = typeChecker.getResolvedSignature(node)) === null || _a === void 0 ? void 0 : _a.declaration;
    if (!declaration || typescript_1.default.isJSDocSignature(declaration) || ((_b = declaration.name) === null || _b === void 0 ? void 0 : _b.getText()) !== 'enumerate') {
        return false;
    }
    try {
        // require.resolve is required to resolve symlink.
        // https://github.com/kimamula/ts-transformer-keys/issues/4#issuecomment-643734716
        return require.resolve(declaration.getSourceFile().fileName) === indexTs;
    }
    catch (_c) {
        // declaration.getSourceFile().fileName may not be in Node.js require stack and require.resolve may result in an error.
        // https://github.com/kimamula/ts-transformer-keys/issues/47
        return false;
    }
}
function resolveStringLiteralTypes(type, literals) {
    if (type.isUnion()) {
        type.types.forEach(function (type) { return resolveStringLiteralTypes(type, literals); });
    }
    else if (type.isStringLiteral()) {
        literals.push(type.value);
    }
}
