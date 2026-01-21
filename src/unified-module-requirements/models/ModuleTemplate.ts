import { ModuleType, TemplateOption } from './types';

export interface ModuleTemplate {
  templateId: string;
  name: string;
  description: string;
  moduleType: ModuleType;
  version: string;
  maintainer: string;
  configurableOptions: TemplateOption[];
  files: TemplateFile[];
  directories: string[];
  scripts: Record<string, string>;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  metadata: {
    created: Date;
    lastUpdated: Date;
    usageCount: number;
    tags: string[];
    documentation: string;
    examples: string[];
  };
}

export interface TemplateFile {
  path: string;
  content: string;
  isTemplate: boolean; // Contains template variables
  required: boolean;
  description: string;
}

export interface TemplateGenerationConfig {
  moduleName: string;
  moduleType: ModuleType;
  outputPath: string;
  variables: Record<string, any>;
  includeOptionalFiles: boolean;
  customizations: Record<string, any>;
}

export class ModuleTemplateEngine {
  private templates: Map<string, ModuleTemplate> = new Map();

  constructor() {
    this.initializeDefaultTemplates();
  }

  private initializeDefaultTemplates(): void {
    const defaultTemplates: ModuleTemplate[] = [
      {
        templateId: 'backend-service',
        name: 'Backend Service Template',
        description: 'Template for creating backend service modules with TypeScript',
        moduleType: ModuleType.BACKEND,
        version: '1.0.0',
        maintainer: 'CVPlus Architecture Team',
        configurableOptions: [
          {
            name: 'includeAuth',
            type: 'boolean',
            description: 'Include authentication middleware',
            defaultValue: true,
            required: false
          },
          {
            name: 'databaseType',
            type: 'string',
            description: 'Database type (firebase, mysql, postgresql)',
            defaultValue: 'firebase',
            required: true,
            validation: '^(firebase|mysql|postgresql)$'
          },
          {
            name: 'apiVersion',
            type: 'string',
            description: 'API version prefix',
            defaultValue: 'v1',
            required: true,
            validation: '^v\\d+$'
          }
        ],
        files: [
          {
            path: 'package.json',
            content: this.getBackendPackageJsonTemplate(),
            isTemplate: true,
            required: true,
            description: 'Package configuration file'
          },
          {
            path: 'tsconfig.json',
            content: this.getBackendTsConfigTemplate(),
            isTemplate: false,
            required: true,
            description: 'TypeScript configuration'
          },
          {
            path: 'src/index.ts',
            content: this.getBackendIndexTemplate(),
            isTemplate: true,
            required: true,
            description: 'Main entry point'
          },
          {
            path: 'src/routes/index.ts',
            content: this.getBackendRoutesTemplate(),
            isTemplate: true,
            required: true,
            description: 'API routes definition'
          },
          {
            path: 'README.md',
            content: this.getBackendReadmeTemplate(),
            isTemplate: true,
            required: true,
            description: 'Module documentation'
          }
        ],
        directories: ['src', 'src/routes', 'src/middleware', 'src/services', 'tests', 'dist'],
        scripts: {
          build: 'tsc',
          test: 'jest',
          lint: 'eslint src/**/*.ts',
          start: 'node dist/index.js',
          dev: 'ts-node src/index.ts'
        },
        dependencies: {
          'express': '^4.18.0',
          'cors': '^2.8.5',
          'helmet': '^6.0.0'
        },
        devDependencies: {
          'typescript': '^5.0.0',
          '@types/express': '^4.17.0',
          '@types/cors': '^2.8.0',
          'jest': '^29.0.0',
          'ts-jest': '^29.0.0',
          'eslint': '^8.0.0'
        },
        metadata: {
          created: new Date(),
          lastUpdated: new Date(),
          usageCount: 0,
          tags: ['backend', 'api', 'express', 'typescript'],
          documentation: 'https://docs.cvplus.dev/templates/backend-service',
          examples: ['user-service', 'notification-service', 'analytics-service']
        }
      },
      {
        templateId: 'frontend-component',
        name: 'Frontend Component Template',
        description: 'Template for creating React component modules with TypeScript',
        moduleType: ModuleType.FRONTEND,
        version: '1.0.0',
        maintainer: 'CVPlus Architecture Team',
        configurableOptions: [
          {
            name: 'includeStorybook',
            type: 'boolean',
            description: 'Include Storybook configuration',
            defaultValue: false,
            required: false
          },
          {
            name: 'styleFramework',
            type: 'string',
            description: 'CSS framework (tailwind, styled-components, css-modules)',
            defaultValue: 'tailwind',
            required: true,
            validation: '^(tailwind|styled-components|css-modules)$'
          },
          {
            name: 'testingLibrary',
            type: 'string',
            description: 'Testing framework (jest, vitest)',
            defaultValue: 'jest',
            required: true,
            validation: '^(jest|vitest)$'
          }
        ],
        files: [
          {
            path: 'package.json',
            content: this.getFrontendPackageJsonTemplate(),
            isTemplate: true,
            required: true,
            description: 'Package configuration file'
          },
          {
            path: 'tsconfig.json',
            content: this.getFrontendTsConfigTemplate(),
            isTemplate: false,
            required: true,
            description: 'TypeScript configuration'
          },
          {
            path: 'src/index.tsx',
            content: this.getFrontendIndexTemplate(),
            isTemplate: true,
            required: true,
            description: 'Main component export'
          },
          {
            path: 'src/components/index.ts',
            content: this.getFrontendComponentsTemplate(),
            isTemplate: true,
            required: true,
            description: 'Component exports'
          }
        ],
        directories: ['src', 'src/components', 'src/hooks', 'src/utils', 'tests', 'dist'],
        scripts: {
          build: 'vite build',
          test: 'jest',
          lint: 'eslint src/**/*.{ts,tsx}',
          storybook: 'storybook dev -p 6006'
        },
        dependencies: {
          'react': '^18.0.0',
          'react-dom': '^18.0.0'
        },
        devDependencies: {
          'typescript': '^5.0.0',
          '@types/react': '^18.0.0',
          '@types/react-dom': '^18.0.0',
          'vite': '^4.0.0',
          'jest': '^29.0.0',
          'eslint': '^8.0.0'
        },
        metadata: {
          created: new Date(),
          lastUpdated: new Date(),
          usageCount: 0,
          tags: ['frontend', 'react', 'component', 'typescript'],
          documentation: 'https://docs.cvplus.dev/templates/frontend-component',
          examples: ['button-component', 'modal-component', 'form-component']
        }
      }
    ];

    defaultTemplates.forEach(template => this.addTemplate(template));
  }

  addTemplate(template: ModuleTemplate): void {
    this.templates.set(template.templateId, template);
  }

  getTemplate(templateId: string): ModuleTemplate | undefined {
    return this.templates.get(templateId);
  }

  getAllTemplates(): ModuleTemplate[] {
    return Array.from(this.templates.values());
  }

  getTemplatesByType(moduleType: ModuleType): ModuleTemplate[] {
    return this.getAllTemplates().filter(template => template.moduleType === moduleType);
  }

  async generateModule(templateId: string, config: TemplateGenerationConfig): Promise<{
    success: boolean;
    files: { path: string; content: string }[];
    errors: string[];
  }> {
    const template = this.getTemplate(templateId);
    if (!template) {
      return {
        success: false,
        files: [],
        errors: [`Template not found: ${templateId}`]
      };
    }

    const errors: string[] = [];
    const generatedFiles: { path: string; content: string }[] = [];

    try {
      // Validate configuration options
      const validationErrors = this.validateConfiguration(template, config);
      if (validationErrors.length > 0) {
        return {
          success: false,
          files: [],
          errors: validationErrors
        };
      }

      // Generate files
      for (const templateFile of template.files) {
        if (!templateFile.required && !config.includeOptionalFiles) {
          continue;
        }

        const fullPath = `${config.outputPath}/${templateFile.path}`;
        let content = templateFile.content;

        if (templateFile.isTemplate) {
          content = this.processTemplate(content, {
            ...config.variables,
            moduleName: config.moduleName,
            moduleType: config.moduleType
          });
        }

        generatedFiles.push({
          path: fullPath,
          content
        });
      }

      // Update template usage statistics
      template.metadata.usageCount++;
      template.metadata.lastUpdated = new Date();

    } catch (error) {
      errors.push(`Generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return {
      success: errors.length === 0,
      files: generatedFiles,
      errors
    };
  }

  private validateConfiguration(template: ModuleTemplate, config: TemplateGenerationConfig): string[] {
    const errors: string[] = [];

    for (const option of template.configurableOptions) {
      const value = config.variables[option.name];

      if (option.required && (value === undefined || value === null)) {
        errors.push(`Required option missing: ${option.name}`);
        continue;
      }

      if (value !== undefined && option.validation) {
        const regex = new RegExp(option.validation);
        if (!regex.test(String(value))) {
          errors.push(`Invalid value for ${option.name}: ${value} (must match ${option.validation})`);
        }
      }

      // Type validation
      if (value !== undefined) {
        const actualType = Array.isArray(value) ? 'array' : typeof value;
        if (actualType !== option.type) {
          errors.push(`Type mismatch for ${option.name}: expected ${option.type}, got ${actualType}`);
        }
      }
    }

    return errors;
  }

  private processTemplate(content: string, variables: Record<string, any>): string {
    let processed = content;

    // Replace template variables in format {{variableName}}
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
      processed = processed.replace(regex, String(value));
    }

    // Replace common template patterns
    processed = processed.replace(/\{\{moduleName\}\}/g, variables.moduleName || 'unnamed-module');
    processed = processed.replace(/\{\{moduleType\}\}/g, variables.moduleType || 'UTILITY');
    processed = processed.replace(/\{\{timestamp\}\}/g, new Date().toISOString());

    return processed;
  }

  updateTemplate(templateId: string, updates: Partial<ModuleTemplate>): boolean {
    const existingTemplate = this.getTemplate(templateId);
    if (!existingTemplate) {
      return false;
    }

    const updatedTemplate = {
      ...existingTemplate,
      ...updates,
      metadata: {
        ...existingTemplate.metadata,
        ...updates.metadata,
        lastUpdated: new Date()
      }
    };

    this.templates.set(templateId, updatedTemplate);
    return true;
  }

  // Template content methods
  private getBackendPackageJsonTemplate(): string {
    return JSON.stringify({
      name: '{{moduleName}}',
      version: '1.0.0',
      description: '{{description}}',
      main: 'dist/index.js',
      types: 'dist/index.d.ts',
      scripts: {
        build: 'tsc',
        test: 'jest',
        lint: 'eslint src/**/*.ts',
        start: 'node dist/index.js',
        dev: 'ts-node src/index.ts'
      }
    }, null, 2);
  }

  private getBackendTsConfigTemplate(): string {
    return JSON.stringify({
      compilerOptions: {
        target: 'ES2020',
        module: 'commonjs',
        outDir: './dist',
        rootDir: './src',
        strict: true,
        esModuleInterop: true,
        skipLibCheck: true,
        forceConsistentCasingInFileNames: true,
        declaration: true,
        declarationMap: true,
        sourceMap: true
      },
      include: ['src/**/*'],
      exclude: ['node_modules', 'dist', 'tests']
    }, null, 2);
  }

  private getBackendIndexTemplate(): string {
    return `import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import routes from './routes';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Routes
app.use('/{{apiVersion}}', routes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: '{{moduleName}}' });
});

export { app };

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(\`{{moduleName}} service listening on port \${PORT}\`);
  });
}`;
  }

  private getBackendRoutesTemplate(): string {
    return `import { Router } from 'express';

const router = Router();

// Example route
router.get('/', (req, res) => {
  res.json({
    message: 'Welcome to {{moduleName}} API',
    version: '{{apiVersion}}'
  });
});

export default router;`;
  }

  private getBackendReadmeTemplate(): string {
    return `# {{moduleName}}

{{description}}

## Installation

\`\`\`bash
npm install
\`\`\`

## Development

\`\`\`bash
npm run dev
\`\`\`

## Build

\`\`\`bash
npm run build
\`\`\`

## Test

\`\`\`bash
npm test
\`\`\`

## API Documentation

### Health Check
- **GET** \`/health\` - Returns service health status

### Main Routes
- **GET** \`/{{apiVersion}}/\` - Welcome message

## Configuration

Environment variables:
- \`PORT\` - Server port (default: 3000)

Generated on {{timestamp}}`;
  }

  private getFrontendPackageJsonTemplate(): string {
    return JSON.stringify({
      name: '{{moduleName}}',
      version: '1.0.0',
      description: '{{description}}',
      main: 'dist/index.js',
      types: 'dist/index.d.ts',
      scripts: {
        build: 'vite build',
        test: 'jest',
        lint: 'eslint src/**/*.{ts,tsx}',
        storybook: 'storybook dev -p 6006'
      },
      peerDependencies: {
        react: '^18.0.0',
        'react-dom': '^18.0.0'
      }
    }, null, 2);
  }

  private getFrontendTsConfigTemplate(): string {
    return JSON.stringify({
      compilerOptions: {
        target: 'ES2020',
        lib: ['DOM', 'DOM.Iterable', 'ES2020'],
        module: 'ESNext',
        moduleResolution: 'node',
        allowSyntheticDefaultImports: true,
        esModuleInterop: true,
        jsx: 'react-jsx',
        strict: true,
        declaration: true,
        outDir: 'dist',
        skipLibCheck: true
      },
      include: ['src/**/*'],
      exclude: ['node_modules', 'dist', 'tests']
    }, null, 2);
  }

  private getFrontendIndexTemplate(): string {
    return `export * from './components';
export { default } from './components/{{moduleName}}';`;
  }

  private getFrontendComponentsTemplate(): string {
    return `import React from 'react';

export interface {{moduleName}}Props {
  children?: React.ReactNode;
  className?: string;
}

export const {{moduleName}}: React.FC<{{moduleName}}Props> = ({
  children,
  className = ''
}) => {
  return (
    <div className={\`{{moduleName.toLowerCase()}} \${className}\`}>
      {children}
    </div>
  );
};

export default {{moduleName}};`;
  }
}