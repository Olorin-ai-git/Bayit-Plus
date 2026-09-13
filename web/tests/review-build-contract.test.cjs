const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const vm = require('node:vm');

const webRoot = path.resolve(__dirname, '..');
const metadataSource = readFileSync(path.join(webRoot, 'build/review-metadata.cjs'), 'utf8');
const revision = 'a'.repeat(40);

function metadata({ head = revision, changes = '', configured, gitMissing = false, statusFails = false } = {}) {
  const module = { exports: {} };
  vm.runInNewContext(metadataSource, {
    module,
    __dirname: path.join(webRoot, 'build'),
    process: { env: { BAYIT_BUILD_SHA: configured } },
    require(name) {
      if (name === 'node:path') return path;
      assert.equal(name, 'node:child_process');
      return {
        execFileSync(command, args) {
          assert.equal(command, 'git');
          if (gitMissing || (statusFails && args[0] === 'status')) throw new Error('Git unavailable');
          return args[0] === 'rev-parse' ? head : changes;
        },
      };
    },
  });
  return module.exports;
}

test('clean immutable source retains its exact revision', () => {
  assert.equal(metadata()(), revision);
});

test('tracked and untracked changes cannot acquire clean-source provenance', () => {
  for (const changes of [' M web/src/App.tsx', '?? web/src/NewRoute.tsx']) {
    assert.equal(metadata({ changes })(), null);
  }
});

test('mutable development and watch builds cannot retain provenance through HMR', () => {
  assert.equal(metadata()({ mutable: true }), null);
});

test('unverifiable checkout status fails closed even with a configured revision', () => {
  assert.equal(metadata({ statusFails: true, configured: revision })(), null);
});

test('source archives require explicit full revision metadata', () => {
  assert.equal(metadata({ gitMissing: true })(), null);
  assert.equal(metadata({ gitMissing: true, configured: revision })(), revision);
  assert.throws(() => metadata({ gitMissing: true, configured: 'short' })(), /full Git SHA/);
});

test('configured and checked-out revision disagreement is rejected', () => {
  assert.throws(() => metadata({ configured: 'b'.repeat(40) })(), /checked-out source/);
});

test('Webpack only assigns provenance to an immutable production compilation', () => {
  const source = readFileSync(path.join(webRoot, 'webpack.config.cjs'), 'utf8');
  const ast = require('@babel/parser').parse(source, { sourceType: 'script' });
  let expression;
  require('@babel/traverse').default(ast, {
    CallExpression({ node }) {
      if (node.callee.name === 'reviewBuildSha') expression = source.slice(node.start, node.end);
    },
  });
  assert.ok(expression);
  for (const [isProduction, argv, env, expected] of [
    [true, {}, {}, revision],
    [false, {}, {}, null],
    [true, { watch: true }, {}, null],
    [true, {}, { WEBPACK_SERVE: true }, null],
  ]) {
    assert.equal(vm.runInNewContext(expression, { isProduction, argv, env, reviewBuildSha: metadata() }), expected);
  }
});

test('Vite development and build-watch configurations disable provenance', async () => {
  const { resolveConfig } = await import('vite');
  for (const [command, watch] of [['serve', null], ['build', {}]]) {
    const config = await resolveConfig({
      configFile: path.join(webRoot, 'vite.config.js'),
      build: { watch },
    }, command);
    assert.equal(config.define.__BAYIT_BUILD_SHA__, 'null');
  }
});

test('Vite direct notification store resolves to the compiled package singleton', async () => {
  const { resolveConfig } = await import('vite');
  const config = await resolveConfig({ configFile: path.join(webRoot, 'vite.config.js') }, 'build');
  const alias = config.resolve.alias.find((item) => item.find === '@olorin/glass-ui/stores');
  const compiledPath = path.resolve(webRoot, '../packages/ui/glass-components/dist/stores/index.mjs');
  assert.equal(alias.replacement, compiledPath);
  const packageRoot = path.resolve(webRoot, '../packages/ui/glass-components');
  const manifest = JSON.parse(readFileSync(path.join(packageRoot, 'package.json'), 'utf8'));
  assert.equal(alias.replacement, path.resolve(packageRoot, manifest.exports['./stores'].import.default));
});
