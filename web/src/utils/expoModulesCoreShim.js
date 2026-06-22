/**
 * Expo Modules Core Shim for Web
 * Provides stub implementations for expo-modules-core APIs used by expo-font
 */

// Stub EventEmitter for web - compatible with class inheritance
function EventEmitter() {
  this.listeners = {};
}

EventEmitter.prototype.addListener = function(eventName, listener) {
  if (!this.listeners[eventName]) {
    this.listeners[eventName] = [];
  }
  this.listeners[eventName].push(listener);
  return { remove: () => this.removeListener(eventName, listener) };
};

EventEmitter.prototype.removeListener = function(eventName, listener) {
  if (this.listeners[eventName]) {
    this.listeners[eventName] = this.listeners[eventName].filter(l => l !== listener);
  }
};

EventEmitter.prototype.emit = function(eventName, ...args) {
  if (this.listeners[eventName]) {
    this.listeners[eventName].forEach(listener => listener(...args));
  }
};

// Stub NativeModule - must be a class that can be extended
function NativeModule() {
  // Empty constructor
}
NativeModule.prototype = Object.create(EventEmitter.prototype);
NativeModule.prototype.constructor = NativeModule;

// Stub requireNativeModule
function requireNativeModule(moduleName) {
  console.warn(`[expo-modules-core shim] requireNativeModule('${moduleName}') called on web - returning stub`); // eslint-disable-line no-console -- intentional shim diagnostic
  return {};
}

// Stub requireOptionalNativeModule
function requireOptionalNativeModule(moduleName) {
  return null;
}

// Stub createPermissionHook
function createPermissionHook(options) {
  return () => [null, () => Promise.resolve({ status: 'granted' }), () => Promise.resolve({ status: 'granted' })];
}

// Stub Platform detection
const Platform = {
  OS: 'web',
  select: (options) => options.web || options.default,
};

// Stub CodedError - using function constructor for inheritance compatibility
function CodedError(code, message) {
  Error.call(this, message);
  this.code = code;
  this.name = 'CodedError';
  this.message = message;
}
CodedError.prototype = Object.create(Error.prototype);
CodedError.prototype.constructor = CodedError;

// Stub UnavailabilityError
function UnavailabilityError(moduleName, propertyName) {
  CodedError.call(this, 'ERR_UNAVAILABLE', `The method or property ${moduleName}.${propertyName} is not available on web`);
}
UnavailabilityError.prototype = Object.create(CodedError.prototype);
UnavailabilityError.prototype.constructor = UnavailabilityError;

// Stub NativeModulesProxy
const NativeModulesProxy = new Proxy({}, {
  get: (target, prop) => {
    return {};
  }
});

// Stub requireNativeViewManager
function requireNativeViewManager(viewName) {
  return () => null;
}

// Stub registerWebModule (used by expo-font on web)
function registerWebModule(ModuleClass, moduleName) {
  // On web, just return the class or an instance
  if (typeof ModuleClass === 'function') {
    return new ModuleClass();
  }
  return ModuleClass;
}

// Named exports
export {
  EventEmitter,
  NativeModule,
  NativeModulesProxy,
  requireNativeModule,
  requireOptionalNativeModule,
  requireNativeViewManager,
  registerWebModule,
  createPermissionHook,
  Platform,
  CodedError,
  UnavailabilityError,
};

// Default export for compatibility
export default {
  EventEmitter,
  NativeModule,
  NativeModulesProxy,
  requireNativeModule,
  requireOptionalNativeModule,
  requireNativeViewManager,
  registerWebModule,
  createPermissionHook,
  Platform,
  CodedError,
  UnavailabilityError,
};
