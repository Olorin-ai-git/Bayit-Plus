#!/usr/bin/env node

import { Command } from 'commander';
import * as path from 'path';
import * as fs from 'fs';
import * as readline from 'readline';
import { getUnifiedModuleRequirementsService } from '../lib/index';

const program = new Command();

interface GenerateOptions {
  template?: string;
  output?: string;
  interactive?: boolean;
  overwrite?: boolean;
  validate?: boolean;
  config?: string;
  dryRun?: boolean;
  silent?: boolean;
}

interface TemplateCustomization {
  [key: string]: any;
}

program
  .name('generate-module')
  .description('Generate a new CVPlus module from templates')
  .version('1.0.0')
  .argument('<module-name>', 'Name of the module to generate')
  .option('-t, --template <name>', 'Template name to use (default: typescript-module)')
  .option('-o, --output <path>', 'Output directory (default: ./)')
  .option('-i, --interactive', 'Enable interactive mode for customization', false)
  .option('--overwrite', 'Overwrite existing files', false)
  .option('--validate', 'Validate generated module after creation', true)
  .option('-c, --config <file>', 'Load generation configuration from file')
  .option('--dry-run', 'Show what would be generated without creating files', false)
  .option('--silent', 'Suppress output except errors', false)
  .action(async (moduleName: string, options: GenerateOptions) => {
    try {
      await generateModule(moduleName, options);
    } catch (error) {
      console.error('❌ Generation failed:', error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  });

// Add list-templates command
program
  .command('list-templates')
  .description('List available module templates')
  .option('-f, --format <format>', 'Output format: table, json', 'table')
  .action(async (options) => {
    try {
      await listTemplates(options);
    } catch (error) {
      console.error('❌ Failed to list templates:', error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  });

async function generateModule(moduleName: string, options: GenerateOptions): Promise<void> {
  if (!isValidModuleName(moduleName)) {
    throw new Error(`Invalid module name: ${moduleName}. Must be alphanumeric with dashes/underscores.`);
  }

  if (!options.silent) {
    console.log(`🚀 Generating module: ${moduleName}`);
  }

  // Load configuration if specified
  let config: any = {};
  if (options.config) {
    config = await loadConfig(options.config);
  }

  // Determine template
  const templateName = options.template || config.template || 'typescript-module';

  // Determine output path
  const outputPath = path.resolve(options.output || config.outputPath || './', moduleName);

  // Check if output path exists
  if (fs.existsSync(outputPath) && !options.overwrite) {
    const overwrite = await promptConfirmation(`Directory ${outputPath} already exists. Overwrite?`);
    if (!overwrite) {
      console.log('❌ Generation cancelled.');
      return;
    }
  }

  // Get template customization options
  let customOptions: TemplateCustomization = config.customOptions || {};

  if (options.interactive) {
    customOptions = await promptForCustomizations(templateName, customOptions);
  }

  if (!options.silent) {
    console.log(`📋 Template: ${templateName}`);
    console.log(`📁 Output: ${outputPath}`);
    if (Object.keys(customOptions).length > 0) {
      console.log(`⚙️  Customizations: ${Object.keys(customOptions).length} options`);
    }
  }

  // Dry run mode
  if (options.dryRun) {
    await performDryRun(moduleName, templateName, outputPath, customOptions);
    return;
  }

  // Generate the module
  const service = getUnifiedModuleRequirementsService();
  const startTime = Date.now();

  const generationResult = await service.moduleGenerator.generateModule({
    moduleName,
    outputPath,
    templateName,
    customOptions
  });

  const endTime = Date.now();
  const duration = endTime - startTime;

  if (!options.silent) {
    console.log(`✅ Module generated successfully!`);
    console.log(`📁 Location: ${generationResult.outputPath}`);
    console.log(`📋 Files created: ${generationResult.filesCreated.length}`);
    console.log(`⏱️  Duration: ${duration}ms`);
  }

  // Validate generated module if requested
  if (options.validate) {
    if (!options.silent) {
      console.log('\n🔍 Validating generated module...');
    }

    const validationResult = await service.moduleValidator.validateModule({
      modulePath: generationResult.outputPath,
      ruleIds: [],
      strictMode: false
    });

    if (validationResult.violations.length === 0) {
      if (!options.silent) {
        console.log('✅ Module validation passed!');
      }
    } else {
      console.log(`⚠️  Module validation found ${validationResult.violations.length} issues:`);
      for (const violation of validationResult.violations.slice(0, 5)) {
        console.log(`  • ${violation.ruleId}: ${violation.message}`);
      }
      if (validationResult.violations.length > 5) {
        console.log(`  • ... and ${validationResult.violations.length - 5} more`);
      }
    }
  }

  // Show next steps
  if (!options.silent) {
    showNextSteps(moduleName, generationResult.outputPath);
  }
}

async function listTemplates(options: { format: string }): Promise<void> {
  const service = getUnifiedModuleRequirementsService();

  const templates = await service.templateManager.listTemplates({
    category: undefined,
    includeMetadata: true
  });

  if (options.format === 'json') {
    console.log(JSON.stringify(templates, null, 2));
    return;
  }

  // Table format
  console.log('\n📋 Available Templates:');
  console.log('═'.repeat(80));

  if (templates.length === 0) {
    console.log('No templates found.');
    return;
  }

  for (const template of templates) {
    console.log(`\n📦 ${template.name}`);
    console.log(`   Description: ${template.description || 'No description'}`);
    console.log(`   Category: ${template.category || 'uncategorized'}`);
    if (template.tags && template.tags.length > 0) {
      console.log(`   Tags: ${template.tags.join(', ')}`);
    }
    if (template.customizableOptions && template.customizableOptions.length > 0) {
      console.log(`   Customizable: ${template.customizableOptions.join(', ')}`);
    }
  }

  console.log(`\n📊 Total: ${templates.length} templates`);
}

async function promptForCustomizations(templateName: string, defaultOptions: TemplateCustomization): Promise<TemplateCustomization> {
  const service = getUnifiedModuleRequirementsService();
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const customOptions = { ...defaultOptions };

  console.log(`\n⚙️  Template Customization for: ${templateName}`);
  console.log('Press Enter to use default values, or type your preferred value.');

  // Get template metadata to know what can be customized
  const templates = await service.templateManager.searchTemplates({
    query: templateName,
    exactMatch: true
  });

  const template = templates.find(t => t.name === templateName);
  const customizableOptions = template?.customizableOptions || [
    'description',
    'author',
    'license',
    'includeTests',
    'includeDocumentation'
  ];

  for (const option of customizableOptions) {
    const defaultValue = customOptions[option] || getDefaultValue(option);
    const prompt = `${option} (${defaultValue}): `;

    const answer = await new Promise<string>((resolve) => {
      rl.question(prompt, resolve);
    });

    if (answer.trim()) {
      customOptions[option] = parseAnswerValue(answer.trim(), option);
    } else {
      customOptions[option] = defaultValue;
    }
  }

  rl.close();
  return customOptions;
}

function getDefaultValue(option: string): any {
  const defaults: Record<string, any> = {
    description: 'A CVPlus module',
    author: 'CVPlus Team',
    license: 'MIT',
    includeTests: true,
    includeDocumentation: true,
    includeExamples: false,
    typescript: true,
    linting: true
  };

  return defaults[option] || '';
}

function parseAnswerValue(answer: string, option: string): any {
  const booleanOptions = ['includeTests', 'includeDocumentation', 'includeExamples', 'typescript', 'linting'];

  if (booleanOptions.includes(option)) {
    return ['true', 'yes', 'y', '1'].includes(answer.toLowerCase());
  }

  return answer;
}

async function performDryRun(moduleName: string, templateName: string, outputPath: string, customOptions: TemplateCustomization): Promise<void> {
  console.log('\n🔍 DRY RUN - No files will be created');
  console.log('═'.repeat(50));
  console.log(`Module Name: ${moduleName}`);
  console.log(`Template: ${templateName}`);
  console.log(`Output Path: ${outputPath}`);
  console.log(`Custom Options: ${JSON.stringify(customOptions, null, 2)}`);

  // Simulate file list that would be created
  const simulatedFiles = [
    'package.json',
    'tsconfig.json',
    'README.md',
    'src/index.ts',
    'src/types.ts'
  ];

  if (customOptions.includeTests) {
    simulatedFiles.push('src/__tests__/index.test.ts');
    simulatedFiles.push('jest.config.js');
  }

  if (customOptions.includeDocumentation) {
    simulatedFiles.push('docs/README.md');
    simulatedFiles.push('docs/api.md');
  }

  console.log('\nFiles that would be created:');
  for (const file of simulatedFiles) {
    console.log(`  📄 ${path.join(outputPath, file)}`);
  }

  console.log(`\n📊 Total: ${simulatedFiles.length} files`);
}

function showNextSteps(moduleName: string, outputPath: string): void {
  console.log('\n🎯 Next Steps:');
  console.log('─'.repeat(30));
  console.log(`1. cd ${path.relative(process.cwd(), outputPath)}`);
  console.log('2. npm install');
  console.log('3. npm run build');
  console.log('4. npm test');
  console.log('\n💡 Tips:');
  console.log('• Run validate-module to check compliance');
  console.log('• Update README.md with your module documentation');
  console.log('• Add your module to the parent project workspace');
}

async function promptConfirmation(message: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(`${message} (y/N): `, (answer) => {
      rl.close();
      resolve(['y', 'yes'].includes(answer.toLowerCase()));
    });
  });
}

function isValidModuleName(name: string): boolean {
  // Allow alphanumeric characters, dashes, underscores, and dots
  return /^[a-zA-Z0-9._-]+$/.test(name) && name.length >= 2;
}

async function loadConfig(configPath: string): Promise<any> {
  const resolvedPath = path.resolve(configPath);

  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`Configuration file not found: ${resolvedPath}`);
  }

  const ext = path.extname(resolvedPath).toLowerCase();

  try {
    if (ext === '.json') {
      const content = fs.readFileSync(resolvedPath, 'utf8');
      return JSON.parse(content);
    } else if (ext === '.js' || ext === '.ts') {
      const configModule = await import(resolvedPath);
      return configModule.default || configModule;
    } else {
      throw new Error(`Unsupported configuration file format: ${ext}`);
    }
  } catch (error) {
    throw new Error(`Failed to load configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason) => {
  console.error('❌ Unhandled promise rejection:', reason);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught exception:', error.message);
  process.exit(1);
});

// Run the CLI if this file is executed directly
if (require.main === module) {
  program.parse();
}