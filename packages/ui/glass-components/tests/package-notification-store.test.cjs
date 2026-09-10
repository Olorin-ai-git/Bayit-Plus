const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');
const { pathToFileURL } = require('node:url');
const vm = require('node:vm');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { buildSync } = require('esbuild');

const packageDirectory = path.resolve(__dirname, '..');
const manifest = require('../package.json');
const requirePackage = Module.createRequire(path.join(packageDirectory, 'package.json'));

// Only platform hosts are replaced. Public package artifacts, React hooks,
// Zustand, and the canonical CommonJS module cache remain real.
const unexpectedPlatformCall = () => assert.fail('Platform rendering is outside the store contract');
const native = {
  Platform: { OS: 'web', isTV: false, select: (values) => values.web ?? values.default },
  StyleSheet: { create: (value) => value },
  I18nManager: { isRTL: false },
  View: 'div', Text: 'span', Pressable: 'button', TouchableOpacity: 'button',
  ActivityIndicator: 'progress', TextInput: 'input', Modal: 'dialog',
  FlatList: 'div', Image: 'img', ScrollView: 'div', TouchableWithoutFeedback: 'button',
  Animated: { View: 'div', Text: 'span' },
  useWindowDimensions: unexpectedPlatformCall,
  PanResponder: { create: unexpectedPlatformCall },
  Easing: { bezier: unexpectedPlatformCall },
  AccessibilityInfo: { announceForAccessibility: unexpectedPlatformCall },
};
const platformModules = {
  'react-native': native,
  'react-native-svg': { default: 'svg', Svg: 'svg', Circle: 'circle', Path: 'path', Line: 'line', Defs: 'defs', RadialGradient: 'radialGradient', Stop: 'stop', G: 'g' },
  'react-native-linear-gradient': { __esModule: true, default: 'div' },
  'react-native-safe-area-context': { useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) },
  'react-native-reanimated': {
    __esModule: true,
    default: { View: 'div' },
    useSharedValue: unexpectedPlatformCall,
    withSpring: unexpectedPlatformCall,
    withTiming: unexpectedPlatformCall,
    runOnJS: unexpectedPlatformCall,
    useAnimatedStyle: unexpectedPlatformCall,
  },
  'react-native-gesture-handler': {},
  '@olorin/shared-icons/native': { NativeIcon: () => null },
};

function target(subpath, format) {
  return path.resolve(packageDirectory, manifest.exports[subpath][format].default);
}

function hookApi(entry) {
  let api;
  function Consumer() {
    api = entry.useNotifications();
    return null;
  }
  renderToStaticMarkup(React.createElement(Consumer));
  return api;
}

function contextApi(entry) {
  let api;
  function Consumer() {
    api = entry.useNotificationContext();
    return null;
  }
  renderToStaticMarkup(React.createElement(entry.NotificationProvider, null, React.createElement(Consumer)));
  return api;
}

function createEsmLoader() {
  const context = vm.createContext({ process, setTimeout, clearTimeout, performance });
  const modules = new Map();
  function external(specifier, filename) {
    const key = filename ?? specifier;
    if (modules.has(key)) return modules.get(key);
    const value = platformModules[specifier] ?? requirePackage(filename ?? specifier);
    const exports = { ...value, default: value.__esModule ? value.default : value };
    const module = new vm.SyntheticModule(Object.keys(exports), function initialize() {
      for (const [name, binding] of Object.entries(exports)) this.setExport(name, binding);
    }, { context, identifier: key });
    modules.set(key, module);
    return module;
  }
  async function load(filename) {
    if (modules.has(filename)) return modules.get(filename);
    const module = new vm.SourceTextModule(fs.readFileSync(filename, 'utf8'), {
      context,
      identifier: filename,
    });
    modules.set(filename, module);
    await module.link((specifier, importer) => {
      if (!specifier.startsWith('.')) return external(specifier);
      const resolved = path.resolve(path.dirname(importer.identifier), specifier);
      return resolved.endsWith('.mjs') ? load(resolved) : external(specifier, resolved);
    });
    return module;
  }
  return async (filename) => {
    const module = await load(filename);
    await module.evaluate();
    return module.namespace;
  };
}

test('emitted CJS and ESM entries share one notification store', async () => {
  const originalLoad = Module._load;
  Module._load = function load(request, parent, isMain) {
    return platformModules[request] ?? originalLoad.call(this, request, parent, isMain);
  };
  try {
    const stores = requirePackage(`${manifest.name}/stores`);
    // Use Node's actual ESM/CJS interop for the canonical stores wrapper.
    const esmStores = await import(pathToFileURL(target('./stores', 'import')).href);
    assert.equal(esmStores.useNotificationStore, stores.useNotificationStore);
    const store = stores.useNotificationStore;
    const importArtifact = createEsmLoader();
    const reset = () => store.setState({ notifications: [], deferredQueue: [], isProviderMounted: false });
    const subpaths = ['.', './native', './web', './hooks'];
    const entries = [];
    for (const format of ['require', 'import']) {
      for (const subpath of subpaths) {
        const entry = format === 'require'
          ? requirePackage(target(subpath, format))
          : await importArtifact(target(subpath, format));
        entries.push({ entry, format, subpath });
        reset();
        store.getState().setProviderMounted(true);
        const api = hookApi(entry);
        const message = `${format}:${subpath}:hook`;
        const id = api.show({ level: 'info', message });
        assert.equal(store.getState().notifications[0]?.message, message, message);
        esmStores.useNotificationStore.getState().remove(id);
        assert.equal(store.getState().notifications.length, 0);
        entry.Notifications.showInfo(`${message}:imperative`);
        assert.equal(store.getState().notifications[0]?.message, `${message}:imperative`);
      }
      reset();
      const contexts = format === 'require'
        ? requirePackage(target('./contexts', format))
        : await importArtifact(target('./contexts', format));
      const api = contextApi(contexts);
      store.getState().setProviderMounted(true);
      api.showInfo(`${format}:context`);
      assert.equal(store.getState().notifications[0]?.message, `${format}:context`);
    }
    // A notification queued through one format is promoted and dismissed
    // through different public entries without creating a second queue.
    reset();
    const first = entries[0].entry;
    const last = entries.at(-1).entry;
    first.Notifications.showInfo('Before provider mount');
    assert.equal(esmStores.useNotificationStore.getState().deferredQueue.length, 1);
    esmStores.useNotificationStore.getState().setProviderMounted(true);
    assert.equal(store.getState().notifications[0]?.message, 'Before provider mount');
    assert.equal(store.getState().deferredQueue.length, 0);
    last.Notifications.dismiss(store.getState().notifications[0].id);
    assert.equal(store.getState().notifications.length, 0);
    reset();
  } finally {
    Module._load = originalLoad;
  }
});

test('independently bundled Glass logging shares application monitoring state', () => {
  const outputDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'glass-logger-'));
  const applicationBundle = path.join(outputDirectory, 'application.cjs');
  const glassBundle = path.join(outputDirectory, 'glass.cjs');
  const loggerStateKey = Symbol.for('@bayit/shared-utils/logger-state');
  const build = (entry, outfile) => buildSync({
    entryPoints: [entry],
    outfile,
    bundle: true,
    platform: 'node',
    format: 'cjs',
    define: {
      'process.env.NODE_ENV': '"production"',
      __DEV__: 'false',
    },
    logLevel: 'silent',
  });

  try {
    delete globalThis[loggerStateKey];
    build(path.resolve(packageDirectory, '../../../shared/utils/logger.ts'), applicationBundle);
    build(path.resolve(packageDirectory, 'src/utils/logger.ts'), glassBundle);
    const application = require(applicationBundle);
    const glass = require(glassBundle);
    const observations = [];
    application.initLoggerSentry({
      captureException(error, options) {
        observations.push({ kind: 'exception', message: error.message, extra: options?.extra });
      },
      captureMessage(message, options) {
        observations.push({ kind: 'message', message, extra: options?.extra });
      },
      setTag(key, value) {
        observations.push({ kind: 'tag', key, value });
      },
    });
    application.setCorrelationId('package-runtime-correlation');
    glass.logger.error('glass-error', 'PackageRuntime', new Error('glass-failure'));

    assert.notEqual(application.logger, glass.logger);
    assert.deepEqual(observations[0], {
      kind: 'tag',
      key: 'correlation_id',
      value: 'package-runtime-correlation',
    });
    assert.equal(observations[1]?.kind, 'exception');
    assert.equal(observations[1]?.message, 'glass-failure');
    assert.equal(observations[1]?.extra?.context, 'PackageRuntime');
    assert.equal(
      observations[1]?.extra?.correlationId,
      'package-runtime-correlation',
    );
    assert.equal(observations[1]?.extra?.data?.message, 'glass-failure');
  } finally {
    delete globalThis[loggerStateKey];
    fs.rmSync(outputDirectory, { recursive: true, force: true });
  }
});
