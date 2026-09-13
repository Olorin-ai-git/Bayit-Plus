const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createRequire, isBuiltin } = require('node:module');
const { test } = require('node:test');
const ts = require('typescript');

const packageRoot = path.resolve(__dirname, '..');
const manifest = require('../package.json');
const resolve = createRequire(path.join(packageRoot, 'package.json')).resolve;
const declared = { ...manifest.dependencies, ...manifest.peerDependencies };

for (const [entry, targets] of Object.entries(manifest.exports)) {
  if (entry === './package.json') continue;
  for (const format of ['import', 'require']) {
    test(`${entry} ${format} declares every emitted external dependency`, () => {
      const file = path.resolve(packageRoot, targets[format]);
      const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
      const imports = new Set();
      function visit(node) {
        if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
          imports.add(node.moduleSpecifier.text);
        }
        if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'require' && node.arguments.length === 1 && ts.isStringLiteral(node.arguments[0])) {
          imports.add(node.arguments[0].text);
        }
        ts.forEachChild(node, visit);
      }
      visit(source);
      for (const imported of imports) {
        if (imported.startsWith('.') || isBuiltin(imported)) continue;
        const dependency = imported.startsWith('@') ? imported.split('/').slice(0, 2).join('/') : imported.split('/')[0];
        assert.ok(declared[dependency], `${entry} imports undeclared runtime dependency ${dependency}`);
        assert.ok(resolve(imported), `${imported} must resolve from the owning package`);
      }
      if (entry === './native') assert.ok(imports.has('lucide-react-native'), 'inspect the real emitted native icon entry');
    });
  }
}
