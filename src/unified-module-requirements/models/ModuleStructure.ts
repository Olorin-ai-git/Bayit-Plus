import { ModuleType, ValidationStatus } from './types';

export interface ExportDefinition {
  name: string;
  type: 'function' | 'class' | 'interface' | 'type' | 'const' | 'default';
  filePath: string;
  isPublic: boolean;
}

export interface ModuleStructure {
  name: string;
  type: ModuleType;
  requiredFiles: string[];
  requiredDirectories: string[];
  optionalFiles: string[];
  entryPoint: string;
  exports: ExportDefinition[];
  version: string;
  lastValidated: Date;
  path: string;
  packageJson?: {
    name: string;
    version: string;
    main?: string;
    types?: string;
    scripts: Record<string, string>;
    dependencies: Record<string, string>;
    devDependencies: Record<string, string>;
  };
}

export enum ModuleState {
  DRAFT = 'DRAFT',
  UNDER_REVIEW = 'UNDER_REVIEW',
  COMPLIANT = 'COMPLIANT',
  NON_COMPLIANT = 'NON_COMPLIANT',
  DEPRECATED = 'DEPRECATED'
}

export class ModuleStructureValidator {
  private readonly requiredFilesByType: Record<ModuleType, string[]> = {
    [ModuleType.BACKEND]: [
      'package.json',
      'tsconfig.json',
      'src/index.ts',
      'README.md'
    ],
    [ModuleType.FRONTEND]: [
      'package.json',
      'tsconfig.json',
      'src/index.tsx',
      'src/components/index.ts',
      'README.md'
    ],
    [ModuleType.UTILITY]: [
      'package.json',
      'tsconfig.json',
      'src/index.ts',
      'README.md'
    ],
    [ModuleType.API]: [
      'package.json',
      'tsconfig.json',
      'src/index.ts',
      'src/routes/index.ts',
      'README.md'
    ],
    [ModuleType.CORE]: [
      'package.json',
      'tsconfig.json',
      'src/index.ts',
      'src/types/index.ts',
      'README.md'
    ]
  };

  private readonly requiredDirectoriesByType: Record<ModuleType, string[]> = {
    [ModuleType.BACKEND]: ['src', 'tests', 'dist'],
    [ModuleType.FRONTEND]: ['src', 'src/components', 'src/hooks', 'tests', 'dist'],
    [ModuleType.UTILITY]: ['src', 'tests', 'dist'],
    [ModuleType.API]: ['src', 'src/routes', 'src/middleware', 'tests', 'dist'],
    [ModuleType.CORE]: ['src', 'src/types', 'src/utils', 'tests', 'dist']
  };

  validate(structure: ModuleStructure): {
    isValid: boolean;
    violations: string[];
    warnings: string[];
    status: ValidationStatus;
  } {
    const violations: string[] = [];
    const warnings: string[] = [];

    // Validate required files
    const requiredFiles = this.requiredFilesByType[structure.type] || [];
    for (const file of requiredFiles) {
      if (!structure.requiredFiles.includes(file)) {
        violations.push(`Missing required file: ${file}`);
      }
    }

    // Validate required directories
    const requiredDirs = this.requiredDirectoriesByType[structure.type] || [];
    for (const dir of requiredDirs) {
      if (!structure.requiredDirectories.includes(dir)) {
        violations.push(`Missing required directory: ${dir}`);
      }
    }

    // Validate entry point
    if (!structure.entryPoint) {
      violations.push('Module must have an entry point defined');
    }

    // Validate package.json
    if (structure.packageJson) {
      if (!structure.packageJson.name) {
        violations.push('package.json must have a name field');
      }
      if (!structure.packageJson.version) {
        violations.push('package.json must have a version field');
      }
      if (!structure.packageJson.main && !structure.packageJson.exports) {
        warnings.push('package.json should have either main or exports field');
      }

      // Validate required scripts
      const requiredScripts = ['build', 'test', 'lint'];
      for (const script of requiredScripts) {
        if (!structure.packageJson.scripts[script]) {
          warnings.push(`package.json should have ${script} script`);
        }
      }
    } else {
      violations.push('Module must have a package.json file');
    }

    // Validate exports
    if (structure.exports.length === 0) {
      warnings.push('Module should export at least one public interface');
    }

    // Validate version format (semver)
    const semverRegex = /^\d+\.\d+\.\d+(-[\w\d\-]+)?(\+[\w\d\-]+)?$/;
    if (!semverRegex.test(structure.version)) {
      violations.push('Version must follow semantic versioning (semver) format');
    }

    // Determine status
    let status: ValidationStatus;
    if (violations.length > 0) {
      status = ValidationStatus.FAIL;
    } else if (warnings.length > 0) {
      status = ValidationStatus.WARNING;
    } else {
      status = ValidationStatus.PASS;
    }

    return {
      isValid: violations.length === 0,
      violations,
      warnings,
      status
    };
  }

  getRequiredFiles(type: ModuleType): string[] {
    return [...this.requiredFilesByType[type]] || [];
  }

  getRequiredDirectories(type: ModuleType): string[] {
    return [...this.requiredDirectoriesByType[type]] || [];
  }

  createDefaultStructure(name: string, type: ModuleType, path: string): ModuleStructure {
    return {
      name,
      type,
      path,
      requiredFiles: this.getRequiredFiles(type),
      requiredDirectories: this.getRequiredDirectories(type),
      optionalFiles: [
        'CHANGELOG.md',
        'API.md',
        '.gitignore',
        '.eslintrc.js',
        'jest.config.js'
      ],
      entryPoint: type === ModuleType.FRONTEND ? 'src/index.tsx' : 'src/index.ts',
      exports: [],
      version: '1.0.0',
      lastValidated: new Date()
    };
  }

  validateExports(exports: ExportDefinition[]): {
    isValid: boolean;
    issues: string[];
  } {
    const issues: string[] = [];
    const names = new Set<string>();

    for (const exp of exports) {
      // Check for duplicate names
      if (names.has(exp.name)) {
        issues.push(`Duplicate export name: ${exp.name}`);
      }
      names.add(exp.name);

      // Validate export name format
      if (!/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(exp.name)) {
        issues.push(`Invalid export name format: ${exp.name}`);
      }

      // Check file path exists (simplified validation)
      if (!exp.filePath || exp.filePath.trim() === '') {
        issues.push(`Export ${exp.name} missing file path`);
      }
    }

    return {
      isValid: issues.length === 0,
      issues
    };
  }

  updateLastValidated(structure: ModuleStructure): ModuleStructure {
    return {
      ...structure,
      lastValidated: new Date()
    };
  }
}