import { createContext, useContext, ReactNode } from 'react';
import { getConfig, AppConfig } from '@/config/schema';

interface ConfigContextValue {
  config: AppConfig;
}

const ConfigContext = createContext<ConfigContextValue | undefined>(undefined);

export function ConfigProvider({ children }: { children: ReactNode }) {
  const config = getConfig();

  return (
    <ConfigContext.Provider value={{ config }}>
      {children}
    </ConfigContext.Provider>
  );
}

export function useConfig() {
  const context = useContext(ConfigContext);
  if (!context) {
    throw new Error('useConfig must be used within ConfigProvider');
  }
  return context.config;
}
