import { Sandbox } from '../services/envConstants';

/**
 * Provides consumers with access to sandbox
 * @returns {Sandbox} sandbox object
 */
export default (): Sandbox => {
  // Return a mock sandbox for now
  return {
    env: 'e2e',
    logger: {
      log: (message: string) => console.log(message),
      error: (message: string) => console.error(message),
    },
    pluginConfig: {
      extendedProperties: {
        API_KEY: process.env.REACT_APP_API_KEY,
      },
    },
  };
};
