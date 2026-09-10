const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');
const webpack = require('webpack');
const webConfig = require('../webpack.config.cjs');

for (const mode of ['development', 'production']) test(`the ${mode} web Babel rule preserves the emitted Glass CommonJS store exports`, async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'bayit-store-bundle-'));
  const config = webConfig({}, { mode });
  const compiler = webpack({
    ...config,
    mode,
    target: 'web',
    entry: path.resolve(__dirname, '../../packages/ui/glass-components/dist/stores/index.mjs'),
    output: { path: directory, filename: 'store.cjs', library: { type: 'commonjs2' } },
    plugins: config.plugins.filter(plugin => ['DefinePlugin', 'ProvidePlugin'].includes(plugin.constructor.name)),
    cache: false,
    devtool: false,
    optimization: { minimize: false },
  });
  try {
    const stats = await new Promise((resolve, reject) => compiler.run((error, result) => error ? reject(error) : resolve(result)));
    assert.equal(stats.hasErrors(), false, stats.toString({ all: false, errors: true, warnings: true }));
    const { useNotificationStore } = require(path.join(directory, 'store.cjs'));
    assert.equal(typeof useNotificationStore, 'function');
    useNotificationStore.getState().setProviderMounted(true);
    const id = useNotificationStore.getState().add({ level: 'info', message: 'Browser bundle boundary verified' });
    assert.equal(useNotificationStore.getState().notifications[0].id, id);
    useNotificationStore.getState().remove(id);
    assert.equal(useNotificationStore.getState().notifications.length, 0);
  } finally {
    await new Promise((resolve, reject) => compiler.close(error => error ? reject(error) : resolve()));
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
