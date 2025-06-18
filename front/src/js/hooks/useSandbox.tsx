// Simple hook that returns null - no sandbox dependency
const useSandbox = () => {
  // Return a simple object that matches expected interface
  return {
    pluginConfig: {
      extendedProperties: {}
    },
    logger: {
      log: (message: string) => console.log(`[Sandbox] ${message}`),
      error: (message: string) => console.error(`[Sandbox] ${message}`)
    }
  };
};

export default useSandbox;
