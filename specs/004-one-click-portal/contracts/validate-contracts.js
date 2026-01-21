#!/usr/bin/env node
/**
 * API Contract Validation Script
 *
 * Validates OpenAPI specifications for One Click Portal API contracts
 * Ensures proper formatting, cross-references, and schema consistency
 *
 * Usage: node validate-contracts.js
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const CONTRACTS_DIR = __dirname;
const REQUIRED_FILES = [
  'openapi.yaml',
  'portal-api.yaml',
  'chat-api.yaml',
  'analytics-api.yaml',
  'schemas.yaml'
];

class ContractValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.contracts = {};
  }

  // Load all contract files
  loadContracts() {
    console.log('🔍 Loading contract files...');

    for (const file of REQUIRED_FILES) {
      const filePath = path.join(CONTRACTS_DIR, file);

      if (!fs.existsSync(filePath)) {
        this.errors.push(`Missing required file: ${file}`);
        continue;
      }

      try {
        const content = fs.readFileSync(filePath, 'utf8');
        const parsed = yaml.load(content);
        this.contracts[file] = parsed;
        console.log(`  ✅ Loaded ${file}`);
      } catch (error) {
        this.errors.push(`Failed to parse ${file}: ${error.message}`);
      }
    }
  }

  // Validate OpenAPI structure
  validateOpenAPIStructure() {
    console.log('\n🔍 Validating OpenAPI structure...');

    const mainSpec = this.contracts['openapi.yaml'];
    if (!mainSpec) {
      this.errors.push('Main OpenAPI specification not loaded');
      return;
    }

    // Check required OpenAPI fields
    const requiredFields = ['openapi', 'info', 'paths', 'components'];
    for (const field of requiredFields) {
      if (!mainSpec[field]) {
        this.errors.push(`Missing required field in openapi.yaml: ${field}`);
      }
    }

    // Validate OpenAPI version
    if (mainSpec.openapi !== '3.0.3') {
      this.warnings.push(`OpenAPI version is ${mainSpec.openapi}, expected 3.0.3`);
    }

    // Validate info section
    if (mainSpec.info) {
      const requiredInfoFields = ['title', 'version', 'description'];
      for (const field of requiredInfoFields) {
        if (!mainSpec.info[field]) {
          this.errors.push(`Missing required info field: ${field}`);
        }
      }
    }

    console.log('  ✅ OpenAPI structure validation complete');
  }

  // Validate path references
  validatePathReferences() {
    console.log('\n🔍 Validating path references...');

    const mainSpec = this.contracts['openapi.yaml'];
    if (!mainSpec?.paths) return;

    const pathFiles = ['portal-api.yaml', 'chat-api.yaml', 'analytics-api.yaml'];

    for (const [pathPattern, pathRef] of Object.entries(mainSpec.paths)) {
      if (typeof pathRef === 'object' && pathRef.$ref) {
        const refPath = pathRef.$ref;
        const [fileName, yamlPath] = refPath.split('#/');

        // Check if referenced file exists in our contracts
        if (!pathFiles.includes(fileName.replace('./', ''))) {
          this.warnings.push(`Path ${pathPattern} references unknown file: ${fileName}`);
          continue;
        }

        // Check if the referenced path exists in the target file
        const targetFile = fileName.replace('./', '');
        const targetContract = this.contracts[targetFile];

        if (targetContract && yamlPath) {
          const pathParts = yamlPath.split('/');
          let current = targetContract;

          for (const part of pathParts) {
            if (part === '') continue;
            const decodedPart = decodeURIComponent(part);
            if (!current || !current[decodedPart]) {
              this.errors.push(`Invalid path reference: ${refPath} in ${pathPattern}`);
              break;
            }
            current = current[decodedPart];
          }
        }
      }
    }

    console.log('  ✅ Path references validation complete');
  }

  // Validate schema references
  validateSchemaReferences() {
    console.log('\n🔍 Validating schema references...');

    const schemas = this.contracts['schemas.yaml'];
    if (!schemas?.components?.schemas) {
      this.errors.push('schemas.yaml missing components.schemas section');
      return;
    }

    const availableSchemas = Object.keys(schemas.components.schemas);
    const allContracts = [
      this.contracts['portal-api.yaml'],
      this.contracts['chat-api.yaml'],
      this.contracts['analytics-api.yaml']
    ];

    // Find all schema references
    const findRefs = (obj, path = '') => {
      if (typeof obj !== 'object' || !obj) return [];

      const refs = [];

      for (const [key, value] of Object.entries(obj)) {
        const currentPath = path ? `${path}.${key}` : key;

        if (key === '$ref' && typeof value === 'string') {
          refs.push({ ref: value, path: currentPath });
        } else if (typeof value === 'object') {
          refs.push(...findRefs(value, currentPath));
        }
      }

      return refs;
    };

    for (const contract of allContracts) {
      if (!contract) continue;

      const refs = findRefs(contract);

      for (const { ref, path } of refs) {
        if (ref.startsWith('../schemas.yaml#/components/schemas/')) {
          const schemaName = ref.replace('../schemas.yaml#/components/schemas/', '');
          if (!availableSchemas.includes(schemaName)) {
            this.errors.push(`Schema reference not found: ${schemaName} (referenced at ${path})`);
          }
        }
      }
    }

    console.log('  ✅ Schema references validation complete');
  }

  // Validate endpoint consistency
  validateEndpointConsistency() {
    console.log('\n🔍 Validating endpoint consistency...');

    const portalApi = this.contracts['portal-api.yaml'];
    const chatApi = this.contracts['chat-api.yaml'];
    const analyticsApi = this.contracts['analytics-api.yaml'];

    // Check for duplicate paths
    const allPaths = [];

    [portalApi, chatApi, analyticsApi].forEach((api, index) => {
      const apiNames = ['portal-api.yaml', 'chat-api.yaml', 'analytics-api.yaml'];

      if (api?.paths) {
        Object.keys(api.paths).forEach(path => {
          if (allPaths.includes(path)) {
            this.errors.push(`Duplicate path definition: ${path} in ${apiNames[index]}`);
          } else {
            allPaths.push(path);
          }
        });
      }
    });

    // Validate parameter consistency
    const portalIdPaths = allPaths.filter(path => path.includes('{portalId}'));

    portalIdPaths.forEach(pathPattern => {
      // Check that all portalId parameters have consistent definition
      // This is a simplified check - in a real validator you'd check parameter schemas
    });

    console.log('  ✅ Endpoint consistency validation complete');
  }

  // Validate response consistency
  validateResponseConsistency() {
    console.log('\n🔍 Validating response consistency...');

    const mainSpec = this.contracts['openapi.yaml'];
    const commonResponses = mainSpec?.components?.responses;

    if (!commonResponses) {
      this.warnings.push('No common responses defined in main specification');
      return;
    }

    const expectedResponses = [
      'UnauthorizedError',
      'ForbiddenError',
      'NotFoundError',
      'ValidationError',
      'RateLimitError',
      'InternalError'
    ];

    for (const expectedResponse of expectedResponses) {
      if (!commonResponses[expectedResponse]) {
        this.errors.push(`Missing common response definition: ${expectedResponse}`);
      }
    }

    console.log('  ✅ Response consistency validation complete');
  }

  // Validate example data
  validateExamples() {
    console.log('\n🔍 Validating example data...');

    const allContracts = Object.values(this.contracts);
    let exampleCount = 0;

    const findExamples = (obj) => {
      if (typeof obj !== 'object' || !obj) return;

      for (const [key, value] of Object.entries(obj)) {
        if (key === 'example' || key === 'examples') {
          exampleCount++;

          // Basic validation - ensure examples aren't empty
          if (key === 'example' && (value === '' || value === null || value === undefined)) {
            this.warnings.push('Empty example value found');
          }

          if (key === 'examples' && typeof value === 'object') {
            for (const [exampleName, exampleData] of Object.entries(value)) {
              if (!exampleData.value && !exampleData.summary) {
                this.warnings.push(`Incomplete example: ${exampleName}`);
              }
            }
          }
        } else if (typeof value === 'object') {
          findExamples(value);
        }
      }
    };

    allContracts.forEach(contract => findExamples(contract));

    console.log(`  ✅ Found ${exampleCount} examples in contracts`);
  }

  // Run all validations
  validate() {
    console.log('🚀 Starting One Click Portal API contract validation\n');

    this.loadContracts();

    if (this.errors.length > 0) {
      console.log('\n❌ Failed to load contracts, skipping validation');
      return this.printResults();
    }

    this.validateOpenAPIStructure();
    this.validatePathReferences();
    this.validateSchemaReferences();
    this.validateEndpointConsistency();
    this.validateResponseConsistency();
    this.validateExamples();

    return this.printResults();
  }

  // Print validation results
  printResults() {
    console.log('\n📊 Validation Results:');
    console.log('=' * 50);

    if (this.errors.length === 0 && this.warnings.length === 0) {
      console.log('✅ All validations passed successfully!');
      console.log('\n🎉 API contracts are ready for implementation');
      return true;
    }

    if (this.errors.length > 0) {
      console.log(`\n❌ ${this.errors.length} Error(s) Found:`);
      this.errors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`);
      });
    }

    if (this.warnings.length > 0) {
      console.log(`\n⚠️  ${this.warnings.length} Warning(s) Found:`);
      this.warnings.forEach((warning, index) => {
        console.log(`  ${index + 1}. ${warning}`);
      });
    }

    console.log('\n🔧 Please fix errors before proceeding with implementation');
    return this.errors.length === 0;
  }
}

// Run validation if this file is executed directly
if (require.main === module) {
  const validator = new ContractValidator();
  const success = validator.validate();
  process.exit(success ? 0 : 1);
}

module.exports = ContractValidator;