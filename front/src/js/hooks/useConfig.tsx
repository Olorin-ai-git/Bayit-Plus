import useSandbox from './useSandbox';

/**
 * This is an addition to ./useSandbox and it returns
 * the config part from sandbox context. In other words it
 * returns sandbox.pluginConfig.extendedProperties
 * @returns {Record<string, any>} Extended properties from config
 */
export default (): Record<string, any> => {
  const sandbox = useSandbox();
  return sandbox.pluginConfig.extendedProperties || {};
};
