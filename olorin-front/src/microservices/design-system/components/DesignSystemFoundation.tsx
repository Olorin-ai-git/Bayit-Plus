import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  DesignTheme,
  ComponentLibrary,
  DesignTokens,
  SemanticColors,
  TypographySystem,
  SpacingSystem,
  LayoutSystem,
  ComponentSize,
  ComponentVariant,
  ColorScale,
  BreakpointKey
} from '../types/design';

// Default Olorin Design System Theme
const createOlorinTheme = (): DesignTheme => ({
  name: 'Olorin Design System',
  version: '1.0.0',
  description: 'Enterprise-grade design system for fraud detection applications',

  colors: {
    primary: {
      blue: {
        '50': { name: 'blue-50', value: '#eff6ff' },
        '100': { name: 'blue-100', value: '#dbeafe' },
        '200': { name: 'blue-200', value: '#bfdbfe' },
        '300': { name: 'blue-300', value: '#93c5fd' },
        '400': { name: 'blue-400', value: '#60a5fa' },
        '500': { name: 'blue-500', value: '#3b82f6' },
        '600': { name: 'blue-600', value: '#2563eb' },
        '700': { name: 'blue-700', value: '#1d4ed8' },
        '800': { name: 'blue-800', value: '#1e40af' },
        '900': { name: 'blue-900', value: '#1e3a8a' },
        '950': { name: 'blue-950', value: '#172554' }
      }
    },
    secondary: {
      gray: {
        '50': { name: 'gray-50', value: '#f9fafb' },
        '100': { name: 'gray-100', value: '#f3f4f6' },
        '200': { name: 'gray-200', value: '#e5e7eb' },
        '300': { name: 'gray-300', value: '#d1d5db' },
        '400': { name: 'gray-400', value: '#9ca3af' },
        '500': { name: 'gray-500', value: '#6b7280' },
        '600': { name: 'gray-600', value: '#4b5563' },
        '700': { name: 'gray-700', value: '#374151' },
        '800': { name: 'gray-800', value: '#1f2937' },
        '900': { name: 'gray-900', value: '#111827' },
        '950': { name: 'gray-950', value: '#030712' }
      }
    },
    success: {
      green: {
        '50': { name: 'green-50', value: '#f0fdf4' },
        '100': { name: 'green-100', value: '#dcfce7' },
        '200': { name: 'green-200', value: '#bbf7d0' },
        '300': { name: 'green-300', value: '#86efac' },
        '400': { name: 'green-400', value: '#4ade80' },
        '500': { name: 'green-500', value: '#22c55e' },
        '600': { name: 'green-600', value: '#16a34a' },
        '700': { name: 'green-700', value: '#15803d' },
        '800': { name: 'green-800', value: '#166534' },
        '900': { name: 'green-900', value: '#14532d' },
        '950': { name: 'green-950', value: '#052e16' }
      }
    },
    warning: {
      yellow: {
        '50': { name: 'yellow-50', value: '#fefce8' },
        '100': { name: 'yellow-100', value: '#fef3c7' },
        '200': { name: 'yellow-200', value: '#fde68a' },
        '300': { name: 'yellow-300', value: '#fcd34d' },
        '400': { name: 'yellow-400', value: '#fbbf24' },
        '500': { name: 'yellow-500', value: '#f59e0b' },
        '600': { name: 'yellow-600', value: '#d97706' },
        '700': { name: 'yellow-700', value: '#b45309' },
        '800': { name: 'yellow-800', value: '#92400e' },
        '900': { name: 'yellow-900', value: '#78350f' },
        '950': { name: 'yellow-950', value: '#451a03' }
      }
    },
    error: {
      red: {
        '50': { name: 'red-50', value: '#fef2f2' },
        '100': { name: 'red-100', value: '#fee2e2' },
        '200': { name: 'red-200', value: '#fecaca' },
        '300': { name: 'red-300', value: '#fca5a5' },
        '400': { name: 'red-400', value: '#f87171' },
        '500': { name: 'red-500', value: '#ef4444' },
        '600': { name: 'red-600', value: '#dc2626' },
        '700': { name: 'red-700', value: '#b91c1c' },
        '800': { name: 'red-800', value: '#991b1b' },
        '900': { name: 'red-900', value: '#7f1d1d' },
        '950': { name: 'red-950', value: '#450a0a' }
      }
    },
    info: {
      cyan: {
        '50': { name: 'cyan-50', value: '#ecfeff' },
        '100': { name: 'cyan-100', value: '#cffafe' },
        '200': { name: 'cyan-200', value: '#a5f3fc' },
        '300': { name: 'cyan-300', value: '#67e8f9' },
        '400': { name: 'cyan-400', value: '#22d3ee' },
        '500': { name: 'cyan-500', value: '#06b6d4' },
        '600': { name: 'cyan-600', value: '#0891b2' },
        '700': { name: 'cyan-700', value: '#0e7490' },
        '800': { name: 'cyan-800', value: '#155e75' },
        '900': { name: 'cyan-900', value: '#164e63' },
        '950': { name: 'cyan-950', value: '#083344' }
      }
    },
    neutral: {
      slate: {
        '50': { name: 'slate-50', value: '#f8fafc' },
        '100': { name: 'slate-100', value: '#f1f5f9' },
        '200': { name: 'slate-200', value: '#e2e8f0' },
        '300': { name: 'slate-300', value: '#cbd5e1' },
        '400': { name: 'slate-400', value: '#94a3b8' },
        '500': { name: 'slate-500', value: '#64748b' },
        '600': { name: 'slate-600', value: '#475569' },
        '700': { name: 'slate-700', value: '#334155' },
        '800': { name: 'slate-800', value: '#1e293b' },
        '900': { name: 'slate-900', value: '#0f172a' },
        '950': { name: 'slate-950', value: '#020617' }
      }
    }
  },

  typography: {
    fontFamilies: {
      sans: {
        name: 'Inter',
        stack: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', '"Helvetica Neue"', 'Arial', '"Noto Sans"', 'sans-serif'],
        description: 'Primary font for UI elements and body text'
      },
      serif: {
        name: 'Georgia',
        stack: ['Georgia', 'ui-serif', 'serif'],
        description: 'Used for headings and emphasis'
      },
      mono: {
        name: 'JetBrains Mono',
        stack: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', '"SF Mono"', 'Consolas', '"Liberation Mono"', 'Menlo', 'monospace'],
        description: 'Code, technical content, and data display'
      }
    },
    scales: {
      xs: { fontSize: '0.75rem', lineHeight: '1rem' },
      sm: { fontSize: '0.875rem', lineHeight: '1.25rem' },
      base: { fontSize: '1rem', lineHeight: '1.5rem' },
      lg: { fontSize: '1.125rem', lineHeight: '1.75rem' },
      xl: { fontSize: '1.25rem', lineHeight: '1.75rem' },
      '2xl': { fontSize: '1.5rem', lineHeight: '2rem' },
      '3xl': { fontSize: '1.875rem', lineHeight: '2.25rem' },
      '4xl': { fontSize: '2.25rem', lineHeight: '2.5rem' },
      '5xl': { fontSize: '3rem', lineHeight: '1' },
      '6xl': { fontSize: '3.75rem', lineHeight: '1' },
      '7xl': { fontSize: '4.5rem', lineHeight: '1' },
      '8xl': { fontSize: '6rem', lineHeight: '1' },
      '9xl': { fontSize: '8rem', lineHeight: '1' }
    },
    semantic: {
      h1: { name: 'heading-1', fontFamily: 'Inter', scale: { fontSize: '2.25rem', lineHeight: '2.5rem', fontWeight: '700' } },
      h2: { name: 'heading-2', fontFamily: 'Inter', scale: { fontSize: '1.875rem', lineHeight: '2.25rem', fontWeight: '600' } },
      h3: { name: 'heading-3', fontFamily: 'Inter', scale: { fontSize: '1.5rem', lineHeight: '2rem', fontWeight: '600' } },
      h4: { name: 'heading-4', fontFamily: 'Inter', scale: { fontSize: '1.25rem', lineHeight: '1.75rem', fontWeight: '600' } },
      h5: { name: 'heading-5', fontFamily: 'Inter', scale: { fontSize: '1.125rem', lineHeight: '1.75rem', fontWeight: '500' } },
      h6: { name: 'heading-6', fontFamily: 'Inter', scale: { fontSize: '1rem', lineHeight: '1.5rem', fontWeight: '500' } },
      body: { name: 'body', fontFamily: 'Inter', scale: { fontSize: '1rem', lineHeight: '1.5rem', fontWeight: '400' } },
      caption: { name: 'caption', fontFamily: 'Inter', scale: { fontSize: '0.875rem', lineHeight: '1.25rem', fontWeight: '400' } },
      overline: { name: 'overline', fontFamily: 'Inter', scale: { fontSize: '0.75rem', lineHeight: '1rem', fontWeight: '500', letterSpacing: '0.05em' } },
      code: { name: 'code', fontFamily: 'JetBrains Mono', scale: { fontSize: '0.875rem', lineHeight: '1.25rem', fontWeight: '400' } }
    }
  },

  spacing: {
    '0': { name: 'none', value: '0', pixels: 0 },
    'px': { name: 'px', value: '1px', pixels: 1 },
    '0.5': { name: '0.5', value: '0.125rem', pixels: 2 },
    '1': { name: '1', value: '0.25rem', pixels: 4 },
    '1.5': { name: '1.5', value: '0.375rem', pixels: 6 },
    '2': { name: '2', value: '0.5rem', pixels: 8 },
    '2.5': { name: '2.5', value: '0.625rem', pixels: 10 },
    '3': { name: '3', value: '0.75rem', pixels: 12 },
    '3.5': { name: '3.5', value: '0.875rem', pixels: 14 },
    '4': { name: '4', value: '1rem', pixels: 16 },
    '5': { name: '5', value: '1.25rem', pixels: 20 },
    '6': { name: '6', value: '1.5rem', pixels: 24 },
    '7': { name: '7', value: '1.75rem', pixels: 28 },
    '8': { name: '8', value: '2rem', pixels: 32 },
    '9': { name: '9', value: '2.25rem', pixels: 36 },
    '10': { name: '10', value: '2.5rem', pixels: 40 },
    '11': { name: '11', value: '2.75rem', pixels: 44 },
    '12': { name: '12', value: '3rem', pixels: 48 },
    '14': { name: '14', value: '3.5rem', pixels: 56 },
    '16': { name: '16', value: '4rem', pixels: 64 },
    '20': { name: '20', value: '5rem', pixels: 80 },
    '24': { name: '24', value: '6rem', pixels: 96 },
    '28': { name: '28', value: '7rem', pixels: 112 },
    '32': { name: '32', value: '8rem', pixels: 128 },
    '36': { name: '36', value: '9rem', pixels: 144 },
    '40': { name: '40', value: '10rem', pixels: 160 },
    '44': { name: '44', value: '11rem', pixels: 176 },
    '48': { name: '48', value: '12rem', pixels: 192 },
    '52': { name: '52', value: '13rem', pixels: 208 },
    '56': { name: '56', value: '14rem', pixels: 224 },
    '60': { name: '60', value: '15rem', pixels: 240 },
    '64': { name: '64', value: '16rem', pixels: 256 },
    '72': { name: '72', value: '18rem', pixels: 288 },
    '80': { name: '80', value: '20rem', pixels: 320 },
    '96': { name: '96', value: '24rem', pixels: 384 }
  },

  layout: {
    breakpoints: {
      xs: { name: 'xs', value: '475px', pixels: 475 },
      sm: { name: 'sm', value: '640px', pixels: 640 },
      md: { name: 'md', value: '768px', pixels: 768 },
      lg: { name: 'lg', value: '1024px', pixels: 1024 },
      xl: { name: 'xl', value: '1280px', pixels: 1280 },
      '2xl': { name: '2xl', value: '1536px', pixels: 1536 }
    },
    containers: {
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1536px'
    },
    grid: {
      columns: 12,
      gap: '1rem',
      gutters: {
        sm: '1rem',
        md: '1.5rem',
        lg: '2rem'
      }
    }
  },

  borderRadius: {
    none: '0',
    sm: '0.125rem',
    md: '0.375rem',
    lg: '0.5rem',
    xl: '0.75rem',
    '2xl': '1rem',
    '3xl': '1.5rem',
    full: '9999px'
  },

  shadows: {
    none: 'none',
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
    '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
    inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)'
  },

  animation: {
    duration: {
      fast: '150ms',
      normal: '300ms',
      slow: '500ms'
    },
    easing: {
      linear: 'linear',
      easeIn: 'cubic-bezier(0.4, 0.0, 1, 1)',
      easeOut: 'cubic-bezier(0.0, 0.0, 0.2, 1)',
      easeInOut: 'cubic-bezier(0.4, 0.0, 0.2, 1)'
    }
  },

  zIndex: {
    dropdown: 1000,
    modal: 1050,
    popover: 1060,
    tooltip: 1070,
    overlay: 1040
  }
});

// Design System Context
interface DesignSystemContextType {
  theme: DesignTheme;
  setTheme: (theme: DesignTheme) => void;
  currentBreakpoint: BreakpointKey;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  getColor: (color: string, scale?: ColorScale) => string;
  getSpacing: (size: string) => string;
  getTypography: (variant: keyof TypographySystem['semantic']) => any;
}

const DesignSystemContext = createContext<DesignSystemContextType | undefined>(undefined);

// Hook to use design system
export const useDesignSystem = () => {
  const context = useContext(DesignSystemContext);
  if (!context) {
    throw new Error('useDesignSystem must be used within a DesignSystemProvider');
  }
  return context;
};

// Utility functions
const getCurrentBreakpoint = (width: number): BreakpointKey => {
  if (width >= 1536) return '2xl';
  if (width >= 1280) return 'xl';
  if (width >= 1024) return 'lg';
  if (width >= 768) return 'md';
  if (width >= 640) return 'sm';
  return 'xs';
};

const getColorValue = (theme: DesignTheme, colorPath: string, scale?: ColorScale): string => {
  const parts = colorPath.split('-');
  if (parts.length === 1) {
    // Simple color name, default to 500 scale
    const colorName = parts[0];
    for (const [category, colors] of Object.entries(theme.colors)) {
      if (colors[colorName]) {
        return colors[colorName]['500']?.value || colors[colorName]['400']?.value || '#000000';
      }
    }
  } else if (parts.length === 2) {
    // Color with scale (e.g., 'blue-500')
    const [colorName, colorScale] = parts;
    for (const [category, colors] of Object.entries(theme.colors)) {
      if (colors[colorName] && colors[colorName][colorScale as ColorScale]) {
        return colors[colorName][colorScale as ColorScale]!.value;
      }
    }
  }

  return colorPath; // Return as-is if not found in theme
};

// Design System Provider Component
interface DesignSystemProviderProps {
  children: React.ReactNode;
  initialTheme?: DesignTheme;
  className?: string;
}

const DesignSystemProvider: React.FC<DesignSystemProviderProps> = ({
  children,
  initialTheme,
  className
}) => {
  const [theme, setTheme] = useState<DesignTheme>(initialTheme || createOlorinTheme());
  const [currentBreakpoint, setCurrentBreakpoint] = useState<BreakpointKey>('lg');
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Monitor window size for responsive breakpoints
  useEffect(() => {
    const handleResize = () => {
      setCurrentBreakpoint(getCurrentBreakpoint(window.innerWidth));
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Apply dark mode classes
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => {
    setIsDarkMode(prev => !prev);
  };

  const getColor = (color: string, scale?: ColorScale) => {
    return getColorValue(theme, color, scale);
  };

  const getSpacing = (size: string) => {
    return theme.spacing[size as keyof typeof theme.spacing]?.value || size;
  };

  const getTypography = (variant: keyof TypographySystem['semantic']) => {
    return theme.typography.semantic[variant];
  };

  const contextValue: DesignSystemContextType = {
    theme,
    setTheme,
    currentBreakpoint,
    isDarkMode,
    toggleDarkMode,
    getColor,
    getSpacing,
    getTypography
  };

  return (
    <DesignSystemContext.Provider value={contextValue}>
      <div
        className={`design-system-root ${isDarkMode ? 'dark' : ''} ${className || ''}`}
        style={{
          '--font-sans': theme.typography.fontFamilies.sans.stack.join(', '),
          '--font-serif': theme.typography.fontFamilies.serif.stack.join(', '),
          '--font-mono': theme.typography.fontFamilies.mono.stack.join(', '),
        } as React.CSSProperties}
      >
        {children}
      </div>
    </DesignSystemContext.Provider>
  );
};

// Design Token Display Component
interface DesignTokenDisplayProps {
  category: 'colors' | 'typography' | 'spacing' | 'shadows' | 'borderRadius';
  interactive?: boolean;
  showCopyCode?: boolean;
  className?: string;
}

const DesignTokenDisplay: React.FC<DesignTokenDisplayProps> = ({
  category,
  interactive = true,
  showCopyCode = true,
  className
}) => {
  const { theme, getColor } = useDesignSystem();

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const renderColors = () => (
    <div className="grid grid-cols-1 gap-8">
      {Object.entries(theme.colors).map(([categoryName, colorGroup]) => (
        <div key={categoryName} className="space-y-4">
          <h3 className="text-lg font-semibold capitalize">{categoryName}</h3>
          {Object.entries(colorGroup).map(([colorName, scales]) => (
            <div key={colorName} className="space-y-2">
              <h4 className="text-md font-medium capitalize">{colorName}</h4>
              <div className="grid grid-cols-2 md:grid-cols-5 lg:grid-cols-11 gap-2">
                {Object.entries(scales).map(([scale, token]) => (
                  <div
                    key={scale}
                    className={`group relative rounded-lg overflow-hidden ${interactive ? 'cursor-pointer hover:ring-2 hover:ring-blue-500' : ''}`}
                    onClick={() => interactive && copyToClipboard(token.value)}
                  >
                    <div
                      className="h-16 w-full"
                      style={{ backgroundColor: token.value }}
                    />
                    <div className="p-2 bg-white dark:bg-gray-800 text-xs">
                      <div className="font-medium">{scale}</div>
                      <div className="text-gray-500 dark:text-gray-400">{token.value}</div>
                      {showCopyCode && (
                        <div className="text-gray-400 dark:text-gray-500 font-mono text-xs mt-1">
                          {colorName}-{scale}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );

  const renderTypography = () => (
    <div className="space-y-6">
      {Object.entries(theme.typography.semantic).map(([variant, config]) => (
        <div key={variant} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <div className="mb-4">
            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 uppercase tracking-wide">
              {variant}
            </h3>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {config.scale.fontSize} / {config.scale.lineHeight} / {config.scale.fontWeight}
            </div>
          </div>
          <div
            className="text-gray-900 dark:text-gray-100"
            style={{
              fontFamily: theme.typography.fontFamilies[config.fontFamily as keyof typeof theme.typography.fontFamilies]?.stack.join(', '),
              fontSize: config.scale.fontSize,
              lineHeight: config.scale.lineHeight,
              fontWeight: config.scale.fontWeight,
              letterSpacing: config.scale.letterSpacing
            }}
          >
            The quick brown fox jumps over the lazy dog
          </div>
          {showCopyCode && (
            <button
              onClick={() => copyToClipboard(`text-${variant}`)}
              className="mt-2 text-xs text-blue-600 dark:text-blue-400 hover:underline"
            >
              Copy class: text-{variant}
            </button>
          )}
        </div>
      ))}
    </div>
  );

  const renderSpacing = () => (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
      {Object.entries(theme.spacing).map(([key, token]) => (
        <div
          key={key}
          className={`group relative border border-gray-200 dark:border-gray-700 rounded-lg p-3 ${interactive ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800' : ''}`}
          onClick={() => interactive && copyToClipboard(token.value)}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">{key}</span>
            <span className="text-xs text-gray-500">{token.pixels}px</span>
          </div>
          <div
            className="bg-blue-500 rounded"
            style={{ height: '4px', width: token.value }}
          />
          <div className="text-xs text-gray-500 mt-1">{token.value}</div>
        </div>
      ))}
    </div>
  );

  return (
    <div className={`design-token-display ${className || ''}`}>
      {category === 'colors' && renderColors()}
      {category === 'typography' && renderTypography()}
      {category === 'spacing' && renderSpacing()}
    </div>
  );
};

// Component Library Browser
interface ComponentLibraryBrowserProps {
  library?: ComponentLibrary;
  onComponentSelect?: (componentName: string) => void;
  className?: string;
}

const ComponentLibraryBrowser: React.FC<ComponentLibraryBrowserProps> = ({
  library,
  onComponentSelect,
  className
}) => {
  const { theme } = useDesignSystem();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  if (!library) {
    return (
      <div className={`text-center py-12 ${className || ''}`}>
        <div className="text-gray-500 dark:text-gray-400">
          No component library loaded
        </div>
      </div>
    );
  }

  const categories = ['all', ...new Set(Object.values(library.components).map(comp => comp.name.split(/(?=[A-Z])/).join('-').toLowerCase()))];

  const filteredComponents = Object.entries(library.components).filter(([name, component]) => {
    const matchesSearch = name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         component.description?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = selectedCategory === 'all' ||
                           name.toLowerCase().includes(selectedCategory);

    return matchesSearch && matchesCategory;
  });

  return (
    <div className={`component-library-browser ${className || ''}`}>
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-gray-700 pb-4 mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {library.name}
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Version {library.version} • {Object.keys(library.components).length} components
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search components..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-gray-100"
          />
        </div>
        <div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-gray-100"
          >
            {categories.map(category => (
              <option key={category} value={category}>
                {category === 'all' ? 'All Categories' : category.charAt(0).toUpperCase() + category.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Component Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredComponents.map(([name, component]) => (
          <div
            key={name}
            className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:border-blue-500 dark:hover:border-blue-400 cursor-pointer transition-colors"
            onClick={() => onComponentSelect?.(name)}
          >
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              {name}
            </h3>
            {component.description && (
              <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">
                {component.description}
              </p>
            )}
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>{Object.keys(component.variants).length} variants</span>
              <span>{Object.keys(component.sizes).length} sizes</span>
            </div>
          </div>
        ))}
      </div>

      {filteredComponents.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-500 dark:text-gray-400">
            No components found matching your criteria
          </div>
        </div>
      )}
    </div>
  );
};

export {
  DesignSystemProvider,
  DesignTokenDisplay,
  ComponentLibraryBrowser,
  createOlorinTheme,
  useDesignSystem
};

export default DesignSystemProvider;