# Quickstart Guide: Frontend Refactoring Implementation

**Purpose**: Step-by-step guide for implementing the frontend refactoring from Material-UI to Tailwind CSS with microservices architecture

## Prerequisites

- Node.js 18+ with npm 8+
- Git with branch `001-refactoring-the-frontend` checked out
- Access to backend API at `localhost:8090`
- Basic understanding of React, TypeScript, and Webpack

## Phase 1: Infrastructure Setup (Week 1)

### 1.1 Install Dependencies

```bash
# Navigate to project root
cd /Users/gklainert/Documents/olorin/olorin-front

# Install Webpack 5 and Module Federation
npm install --save-dev @module-federation/webpack webpack webpack-cli webpack-dev-server

# Install Tailwind CSS and dependencies
npm install -D tailwindcss@^3.3.0 postcss autoprefixer @tailwindcss/forms @tailwindcss/typography

# Install Headless UI for accessible components
npm install @headlessui/react @heroicons/react

# Install state management and event bus
npm install zustand mitt

# Install testing utilities
npm install --save-dev @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

### 1.2 Configure Tailwind CSS

```bash
# Initialize Tailwind configuration
npx tailwindcss init -p

# Update tailwind.config.js
cat > tailwind.config.js << 'EOF'
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./src/microservices/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#faf5ff',
          100: '#f3e8ff',
          200: '#e9d5ff',
          300: '#d8b4fe',
          400: '#c084fc',
          500: '#a855f7',
          600: '#9333ea',
          700: '#7c3aed',
          800: '#6b21a8',
          900: '#581c87',
        },
        olorin: {
          purple: '#9333ea',
          light: '#faf5ff',
          dark: '#581c87',
        }
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular'],
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ],
}
EOF
```

### 1.3 Set up Module Federation

Create the main shell configuration:

```bash
# Create webpack config for the shell app
cat > webpack.config.js << 'EOF'
const ModuleFederationPlugin = require("@module-federation/webpack");

module.exports = {
  mode: "development",
  devServer: {
    port: 3000,
    historyApiFallback: true,
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: "ts-loader",
        exclude: /node_modules/,
      },
      {
        test: /\.css$/i,
        use: ["style-loader", "css-loader", "postcss-loader"],
      },
    ],
  },
  plugins: [
    new ModuleFederationPlugin({
      name: "shell",
      remotes: {
        investigation: "investigation@http://localhost:3001/remoteEntry.js",
        agentAnalytics: "agentAnalytics@http://localhost:3002/remoteEntry.js",
        ragIntelligence: "ragIntelligence@http://localhost:3003/remoteEntry.js",
        visualization: "visualization@http://localhost:3004/remoteEntry.js",
        reporting: "reporting@http://localhost:3005/remoteEntry.js",
        coreUI: "coreUI@http://localhost:3006/remoteEntry.js",
      },
      shared: {
        react: { singleton: true },
        "react-dom": { singleton: true },
        "react-router-dom": { singleton: true },
      },
    }),
  ],
  resolve: {
    extensions: [".tsx", ".ts", ".js"],
  },
};
EOF
```

### 1.4 Create Event Bus

```bash
# Create shared event bus
mkdir -p src/shared/events
cat > src/shared/events/eventBus.ts << 'EOF'
import mitt, { Emitter } from 'mitt';

export interface EventBusEvents {
  // Investigation events
  'investigation:started': { investigation: any };
  'investigation:updated': { investigationId: string; updates: any };
  'investigation:completed': { investigationId: string; results: any };

  // Agent events
  'agent:execution:started': { execution: any };
  'agent:execution:progress': { executionId: string; progress: number };
  'agent:execution:completed': { executionId: string; results: any };
  'agent:log': { executionId: string; log: any };

  // RAG events
  'rag:query:started': { sessionId: string; query: any };
  'rag:insight:generated': { sessionId: string; insight: any };
  'rag:analytics:updated': { sessionId: string; analytics: any };

  // UI events
  'ui:navigation': { path: string; params?: Record<string, any> };
  'ui:notification': { notification: any };
  'ui:theme:changed': { theme: any };
}

class EventBus {
  private emitter: Emitter<EventBusEvents>;

  constructor() {
    this.emitter = mitt<EventBusEvents>();
  }

  emit<K extends keyof EventBusEvents>(event: K, data: EventBusEvents[K]) {
    this.emitter.emit(event, data);
  }

  on<K extends keyof EventBusEvents>(event: K, handler: (data: EventBusEvents[K]) => void) {
    this.emitter.on(event, handler);
  }

  off<K extends keyof EventBusEvents>(event: K, handler: (data: EventBusEvents[K]) => void) {
    this.emitter.off(event, handler);
  }

  clear() {
    this.emitter.all.clear();
  }
}

export const eventBus = new EventBus();
EOF
```

## Phase 2: Tailwind Component Library (Week 1-2)

### 2.1 Create Design System Foundation

```bash
# Create component library structure
mkdir -p src/shared/components/{base,forms,layout,feedback,navigation}

# Create design tokens
cat > src/shared/tokens/index.ts << 'EOF'
export const tokens = {
  colors: {
    primary: {
      50: '#faf5ff',
      100: '#f3e8ff',
      200: '#e9d5ff',
      300: '#d8b4fe',
      400: '#c084fc',
      500: '#a855f7',
      600: '#9333ea',
      700: '#7c3aed',
      800: '#6b21a8',
      900: '#581c87',
    },
    gray: {
      50: '#f9fafb',
      100: '#f3f4f6',
      200: '#e5e7eb',
      300: '#d1d5db',
      400: '#9ca3af',
      500: '#6b7280',
      600: '#4b5563',
      700: '#374151',
      800: '#1f2937',
      900: '#111827',
    },
    success: {
      50: '#f0fdf4',
      500: '#10b981',
      900: '#064e3b',
    },
    warning: {
      50: '#fffbeb',
      500: '#f59e0b',
      900: '#78350f',
    },
    error: {
      50: '#fef2f2',
      500: '#ef4444',
      900: '#7f1d1d',
    },
  },
  spacing: {
    xs: '0.5rem',   // 8px
    sm: '1rem',     // 16px
    md: '1.5rem',   // 24px
    lg: '2rem',     // 32px
    xl: '3rem',     // 48px
    '2xl': '4rem',  // 64px
  },
  typography: {
    xs: '0.75rem',    // 12px
    sm: '0.875rem',   // 14px
    base: '1rem',     // 16px
    lg: '1.125rem',   // 18px
    xl: '1.25rem',    // 20px
    '2xl': '1.5rem',  // 24px
    '3xl': '1.875rem', // 30px
    '4xl': '2.25rem', // 36px
  },
  borderRadius: {
    none: '0',
    sm: '0.125rem',
    base: '0.25rem',
    md: '0.375rem',
    lg: '0.5rem',
    xl: '0.75rem',
    '2xl': '1rem',
    full: '9999px',
  },
};
EOF
```

### 2.2 Create Base Components

```bash
# Create Button component to replace Material-UI Button
cat > src/shared/components/base/Button.tsx << 'EOF'
import React from 'react';
import { tokens } from '../../tokens';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  children,
  className = '',
  disabled,
  ...props
}) => {
  const baseClasses = 'inline-flex items-center justify-center font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

  const variantClasses = {
    primary: 'bg-primary-600 text-white hover:bg-primary-700 shadow-sm',
    secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300',
    outline: 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50',
    ghost: 'text-gray-700 hover:bg-gray-100',
  };

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm rounded-md',
    md: 'px-4 py-2 text-base rounded-md',
    lg: 'px-6 py-3 text-lg rounded-lg',
  };

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      )}
      {leftIcon && <span className="mr-2">{leftIcon}</span>}
      {children}
      {rightIcon && <span className="ml-2">{rightIcon}</span>}
    </button>
  );
};
EOF
```

### 2.3 Create Input Component

```bash
# Create Input component to replace Material-UI TextField
cat > src/shared/components/forms/Input.tsx << 'EOF'
import React, { forwardRef } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  className = '',
  id,
  ...props
}, ref) => {
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;

  const baseClasses = 'block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm';
  const errorClasses = error ? 'border-red-300 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500' : '';

  return (
    <div className="space-y-1">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-gray-700">
          {label}
          {props.required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      <div className="relative">
        {leftIcon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="text-gray-400 sm:text-sm">{leftIcon}</span>
          </div>
        )}

        <input
          ref={ref}
          id={inputId}
          className={`${baseClasses} ${errorClasses} ${leftIcon ? 'pl-10' : ''} ${rightIcon ? 'pr-10' : ''} ${className}`}
          {...props}
        />

        {rightIcon && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <span className="text-gray-400 sm:text-sm">{rightIcon}</span>
          </div>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      {helperText && !error && (
        <p className="text-sm text-gray-500">{helperText}</p>
      )}
    </div>
  );
});

Input.displayName = 'Input';
EOF
```

## Phase 3: Microservice Setup (Week 2-3)

### 3.1 Create Investigation Service

```bash
# Create investigation microservice structure
mkdir -p src/microservices/investigation/{components,hooks,services,types}

# Create investigation service entry point
cat > src/microservices/investigation/App.tsx << 'EOF'
import React from 'react';
import { InvestigationProvider } from './hooks/useInvestigation';
import { InvestigationDashboard } from './components/InvestigationDashboard';

export const InvestigationApp: React.FC = () => {
  return (
    <InvestigationProvider>
      <div className="investigation-service p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Investigation Service</h1>
        <InvestigationDashboard />
      </div>
    </InvestigationProvider>
  );
};

export default InvestigationApp;
EOF

# Create investigation service webpack config
cat > src/microservices/investigation/webpack.config.js << 'EOF'
const ModuleFederationPlugin = require("@module-federation/webpack");

module.exports = {
  mode: "development",
  devServer: {
    port: 3001,
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: "ts-loader",
        exclude: /node_modules/,
      },
      {
        test: /\.css$/i,
        use: ["style-loader", "css-loader", "postcss-loader"],
      },
    ],
  },
  plugins: [
    new ModuleFederationPlugin({
      name: "investigation",
      filename: "remoteEntry.js",
      exposes: {
        "./App": "./src/microservices/investigation/App",
      },
      shared: {
        react: { singleton: true },
        "react-dom": { singleton: true },
      },
    }),
  ],
  resolve: {
    extensions: [".tsx", ".ts", ".js"],
  },
};
EOF
```

### 3.2 Create Service Templates

```bash
# Create a script to generate microservice templates
cat > scripts/create-microservice.sh << 'EOF'
#!/bin/bash

SERVICE_NAME=$1
PORT=$2

if [ -z "$SERVICE_NAME" ] || [ -z "$PORT" ]; then
  echo "Usage: $0 <service-name> <port>"
  exit 1
fi

SERVICE_DIR="src/microservices/$SERVICE_NAME"

# Create directory structure
mkdir -p "$SERVICE_DIR"/{components,hooks,services,types}

# Create App.tsx
cat > "$SERVICE_DIR/App.tsx" << EOL
import React from 'react';

export const ${SERVICE_NAME^}App: React.FC = () => {
  return (
    <div className="${SERVICE_NAME}-service p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">${SERVICE_NAME^} Service</h1>
      <p className="text-gray-600">This is the ${SERVICE_NAME} microservice.</p>
    </div>
  );
};

export default ${SERVICE_NAME^}App;
EOL

# Create webpack.config.js
cat > "$SERVICE_DIR/webpack.config.js" << EOL
const ModuleFederationPlugin = require("@module-federation/webpack");

module.exports = {
  mode: "development",
  devServer: {
    port: $PORT,
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: "ts-loader",
        exclude: /node_modules/,
      },
      {
        test: /\.css$/i,
        use: ["style-loader", "css-loader", "postcss-loader"],
      },
    ],
  },
  plugins: [
    new ModuleFederationPlugin({
      name: "$SERVICE_NAME",
      filename: "remoteEntry.js",
      exposes: {
        "./App": "./src/microservices/$SERVICE_NAME/App",
      },
      shared: {
        react: { singleton: true },
        "react-dom": { singleton: true },
      },
    }),
  ],
  resolve: {
    extensions: [".tsx", ".ts", ".js"],
  },
};
EOL

# Create package.json scripts entry
echo "Add to package.json scripts:"
echo "\"dev:$SERVICE_NAME\": \"webpack serve --config src/microservices/$SERVICE_NAME/webpack.config.js\""

echo "Microservice $SERVICE_NAME created successfully!"
EOF

chmod +x scripts/create-microservice.sh
```

## Phase 4: Migration Process (Week 3-6)

### 4.1 Component Migration Strategy

```bash
# Create migration tracking script
cat > scripts/migration-tracker.sh << 'EOF'
#!/bin/bash

echo "Frontend Refactoring Migration Status"
echo "====================================="
echo

# Check Material-UI imports
MUI_IMPORTS=$(grep -r "@mui/" src/ --include="*.tsx" --include="*.ts" | wc -l)
echo "Material-UI imports remaining: $MUI_IMPORTS"

# Check styled-components usage
STYLED_COMPONENTS=$(grep -r "styled\." src/ --include="*.tsx" --include="*.ts" | wc -l)
echo "Styled-components usage: $STYLED_COMPONENTS"

# Check files over 200 lines
LARGE_FILES=$(find src/ -name "*.tsx" -o -name "*.ts" | xargs wc -l | awk '$1 > 200 {print $2}' | wc -l)
echo "Files over 200 lines: $LARGE_FILES"

echo
echo "Large files (>200 lines):"
find src/ -name "*.tsx" -o -name "*.ts" | xargs wc -l | awk '$1 > 200 {print $1 " lines: " $2}' | sort -rn

echo
echo "Next migration targets:"
grep -r "@mui/" src/ --include="*.tsx" --include="*.ts" | head -5
EOF

chmod +x scripts/migration-tracker.sh
```

### 4.2 Test Migration Components

```bash
# Create test for Button migration
cat > src/shared/components/base/__tests__/Button.test.tsx << 'EOF'
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '../Button';

describe('Button Component', () => {
  it('renders primary button correctly', () => {
    render(<Button variant="primary">Click me</Button>);
    const button = screen.getByRole('button', { name: /click me/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass('bg-primary-600');
  });

  it('handles click events', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);

    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('shows loading state', () => {
    render(<Button isLoading>Loading</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('applies custom className', () => {
    render(<Button className="custom-class">Button</Button>);
    expect(screen.getByRole('button')).toHaveClass('custom-class');
  });
});
EOF
```

## Phase 5: Testing & Validation (Week 6-7)

### 5.1 Integration Testing

```bash
# Create integration test setup
cat > src/__tests__/integration/microservices.test.tsx << 'EOF'
import React from 'react';
import { render } from '@testing-library/react';

// Mock Module Federation imports
jest.mock('investigation/App', () => ({
  default: () => <div data-testid="investigation-service">Investigation Service</div>
}));

jest.mock('agentAnalytics/App', () => ({
  default: () => <div data-testid="agent-analytics-service">Agent Analytics Service</div>
}));

describe('Microservices Integration', () => {
  it('loads investigation service', async () => {
    const InvestigationApp = (await import('investigation/App')).default;
    const { getByTestId } = render(<InvestigationApp />);
    expect(getByTestId('investigation-service')).toBeInTheDocument();
  });

  it('loads agent analytics service', async () => {
    const AgentAnalyticsApp = (await import('agentAnalytics/App')).default;
    const { getByTestId } = render(<AgentAnalyticsApp />);
    expect(getByTestId('agent-analytics-service')).toBeInTheDocument();
  });
});
EOF
```

### 5.2 Performance Testing

```bash
# Create performance test script
cat > scripts/performance-test.sh << 'EOF'
#!/bin/bash

echo "Running Performance Tests..."

# Build the application
npm run build

# Analyze bundle size
npx webpack-bundle-analyzer build/static/js/*.js --report build/bundle-report.html

# Run Lighthouse audit
npx lighthouse http://localhost:3000 --output html --output-path build/lighthouse-report.html

echo "Performance reports generated:"
echo "- Bundle analysis: build/bundle-report.html"
echo "- Lighthouse audit: build/lighthouse-report.html"
EOF

chmod +x scripts/performance-test.sh
```

## Phase 6: Deployment & Monitoring (Week 8)

### 6.1 Docker Configuration

```bash
# Create Dockerfile for microservices
cat > Dockerfile.microservice << 'EOF'
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3000

CMD ["npm", "start"]
EOF

# Create docker-compose for local development
cat > docker-compose.dev.yml << 'EOF'
version: '3.8'

services:
  shell:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
    volumes:
      - .:/app
      - /app/node_modules

  investigation:
    build: .
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=development
      - SERVICE_NAME=investigation
    volumes:
      - .:/app
      - /app/node_modules

  agent-analytics:
    build: .
    ports:
      - "3002:3002"
    environment:
      - NODE_ENV=development
      - SERVICE_NAME=agentAnalytics
    volumes:
      - .:/app
      - /app/node_modules
EOF
```

## Success Verification

### Verification Checklist

Run these commands to verify successful implementation:

```bash
# 1. Check no Material-UI imports remain
grep -r "@mui/" src/ --include="*.tsx" --include="*.ts" || echo "✅ No Material-UI imports found"

# 2. Check all files are under 200 lines
find src/ -name "*.tsx" -o -name "*.ts" | xargs wc -l | awk '$1 > 200 {print $2}' | wc -l

# 3. Test microservices start correctly
npm run dev:shell &
npm run dev:investigation &
npm run dev:agent-analytics &

# 4. Run test suite
npm test

# 5. Check bundle size
npm run build && npm run analyze

# 6. Verify Tailwind classes work
echo "Check that components use tw- classes instead of MUI sx props"
```

### Expected Results

✅ **Zero Material-UI imports**
✅ **All files under 200 lines**
✅ **6 microservices running independently**
✅ **Tailwind CSS styling throughout**
✅ **Event bus communication working**
✅ **WebSocket integration functional**
✅ **Bundle size reduced by 40%**
✅ **Page load time under 3 seconds**

## Troubleshooting

### Common Issues

1. **Module Federation errors**: Check webpack configs and ports
2. **Tailwind styles not applying**: Verify postcss.config.js and content paths
3. **Event bus not working**: Check event names match between services
4. **Large file warnings**: Use the file splitting patterns from Phase 4

### Support Commands

```bash
# Debug webpack issues
npm run build -- --verbose

# Check service health
curl http://localhost:3001/health

# View event bus activity
console.log(eventBus.emitter.all);
```

This quickstart guide provides a complete roadmap for implementing the frontend refactoring successfully.