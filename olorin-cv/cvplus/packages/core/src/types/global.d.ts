// Global type declarations for temporary use
declare global {
  type Logger = {
    info: (message: string, data?: any) => void;
    error: (message: string, data?: any) => void;
    warn: (message: string, data?: any) => void;
    debug: (message: string, data?: any) => void;
  };
}

export {}; // Make this a module