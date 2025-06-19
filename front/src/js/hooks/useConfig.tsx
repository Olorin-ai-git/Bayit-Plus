import useSandbox from './useSandbox';

/**
 * This is an addition to ./useSandbox and it returns
 * the config part from sandbox context. In other words it
 * abstracts out where the config is coming from.
 *
 * @returns {Record} environment specific config
 */
const useConfig = (): Record<string, any> => {
  const sandbox = useSandbox();
  return sandbox.pluginConfig?.extendedProperties || {};
};

export default useConfig;
