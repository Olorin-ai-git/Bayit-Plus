import React, { createContext, useContext, ReactNode } from 'react';
import { ChartTheme, OLORIN_CHART_THEME } from '../types/chart.types';

interface ChartThemeContextType {
  theme: ChartTheme;
  updateTheme: (theme: Partial<ChartTheme>) => void;
}

const ChartThemeContext = createContext<ChartThemeContextType | undefined>(undefined);

interface ChartThemeProviderProps {
  children: ReactNode;
  customTheme?: Partial<ChartTheme>;
}

export function ChartThemeProvider({ children, customTheme }: ChartThemeProviderProps) {
  const [theme, setTheme] = React.useState<ChartTheme>({
    ...OLORIN_CHART_THEME,
    ...customTheme
  });

  const updateTheme = React.useCallback((updates: Partial<ChartTheme>) => {
    setTheme(prev => ({ ...prev, ...updates }));
  }, []);

  const value = React.useMemo(
    () => ({ theme, updateTheme }),
    [theme, updateTheme]
  );

  return (
    <ChartThemeContext.Provider value={value}>
      {children}
    </ChartThemeContext.Provider>
  );
}

export function useChartTheme(): ChartThemeContextType {
  const context = useContext(ChartThemeContext);

  if (!context) {
    throw new Error('useChartTheme must be used within a ChartThemeProvider');
  }

  return context;
}

export function getChartColors(count: number, theme: ChartTheme = OLORIN_CHART_THEME): string[] {
  const colors: string[] = [];
  const accentCount = theme.accentColors.length;

  for (let i = 0; i < count; i++) {
    colors.push(theme.accentColors[i % accentCount]);
  }

  return colors;
}

export function getStatusColor(status: 'success' | 'warning' | 'error' | 'info', theme: ChartTheme = OLORIN_CHART_THEME): string {
  switch (status) {
    case 'success':
      return theme.successColor;
    case 'warning':
      return theme.warningColor;
    case 'error':
      return theme.errorColor;
    case 'info':
      return theme.infoColor;
  }
}
