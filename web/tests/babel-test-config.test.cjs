const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const { transformSync } = require('@babel/core');

const configFile = path.resolve(__dirname, '../babel.config.cjs');

test('Jest reads its configured environment through guarded import metadata', () => {
  const source = `
    globalThis.result = typeof import.meta !== 'undefined' &&
      import.meta.env.TEST_BUILD === import.meta['env'].TEST_BUILD;
    globalThis.build = import.meta.env.TEST_BUILD;
  `;
  const { code } = transformSync(source, { configFile, filename: __filename, envName: 'test' });
  const context = { process: { env: { TEST_BUILD: 'review-build' } } };
  vm.runInNewContext(code, context);
  assert.equal(context.result, true);
  assert.equal(context.build, 'review-build');
});

test('production compilation retains import metadata for the application bundler', () => {
  const { code } = transformSync('globalThis.build = import.meta.env.TEST_BUILD;', {
    configFile,
    filename: __filename,
    envName: 'production',
  });
  assert.match(code, /import\.meta\.env\.TEST_BUILD/);
  assert.doesNotMatch(code, /process\.env/);
});

test('the test transform preserves unrelated metadata for explicit handling', () => {
  const { code } = transformSync('globalThis.moduleUrl = import.meta.url;', {
    configFile,
    filename: __filename,
    envName: 'test',
  });
  assert.match(code, /import\.meta\.url/);
});
