import React, { createContext, useContext } from 'react';

// Mock sandbox interface
export interface Sandbox {
  // Add any sandbox methods that might be needed
  [key: string]: any;
}

// Create a mock sandbox context
const SandboxContext = createContext<Sandbox | null>(null);

// Mock sandbox provider component
export const SandboxProvider: React.FC<{ children: React.ReactNode; sandbox?: Sandbox }> = ({ 
  children, 
  sandbox = {} 
}) => {
  return (
    <SandboxContext.Provider value={sandbox}>
      {children}
    </SandboxContext.Provider>
  );
};

// Hook to use sandbox context
export const useSandboxContext = (): Sandbox => {
  const context = useContext(SandboxContext);
  if (!context) {
    // Return a mock sandbox if no context is provided
    return {
      // Add any default sandbox methods here
    };
  }
  return context;
}; 