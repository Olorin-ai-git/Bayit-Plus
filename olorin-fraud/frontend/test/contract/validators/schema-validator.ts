/**
 * OpenAPI Schema Validator
 *
 * Validates API responses against OpenAPI schema using AJV (JSON Schema validator).
 *
 * Constitutional Compliance:
 * - Schema loaded from generated OpenAPI file (single source of truth)
 * - No hardcoded schema definitions
 * - Fail-fast validation behavior
 * - Clear error messages for schema violations
 */

import Ajv, { ValidateFunction } from 'ajv';
import addFormats from 'ajv-formats';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Schema validation configuration
 *
 * Constitutional Compliance:
 * - Schema path from configuration
 * - Strict validation settings
 */
const SCHEMA_CONFIG = {
  schemaPath: process.env.OPENAPI_SCHEMA_PATH ||
    path.join(__dirname, '../../../src/api/generated/openapi.json'),
  strictMode: process.env.SCHEMA_STRICT_MODE !== 'false'
};

/**
 * Initialize AJV validator with OpenAPI schema
 *
 * Constitutional Compliance:
 * - Strict validation (no additional properties by default)
 * - All standard formats supported (date-time, email, uuid, etc.)
 * - Clear error messages
 */
export function createSchemaValidator(): Ajv {
  const ajv = new Ajv({
    strict: SCHEMA_CONFIG.strictMode,
    allErrors: true,
    verbose: true,
    validateFormats: true,
    strictSchema: true
  });

  // Add standard formats (date-time, email, uri, uuid, etc.)
  addFormats(ajv);

  return ajv;
}

/**
 * Load OpenAPI schema from file
 *
 * Constitutional Compliance:
 * - Schema loaded from file (not hardcoded)
 * - Fail-fast if schema file missing or invalid
 *
 * @returns Parsed OpenAPI schema
 * @throws Error if schema cannot be loaded
 */
export function loadOpenApiSchema(): Record<string, unknown> {
  try {
    const schemaContent = fs.readFileSync(SCHEMA_CONFIG.schemaPath, 'utf-8');
    const schema = JSON.parse(schemaContent);

    if (!schema.openapi) {
      throw new Error('Invalid OpenAPI schema: missing "openapi" field');
    }

    if (!schema.components || !schema.components.schemas) {
      throw new Error('Invalid OpenAPI schema: missing components.schemas');
    }

    console.log(`✅ Loaded OpenAPI schema from: ${SCHEMA_CONFIG.schemaPath}`);
    console.log(`   OpenAPI version: ${schema.openapi}`);
    console.log(`   Schemas defined: ${Object.keys(schema.components.schemas).length}`);

    return schema;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new Error(
        `OpenAPI schema file not found: ${SCHEMA_CONFIG.schemaPath}\n` +
        `Run 'npm run generate-api-types' to generate the schema.`
      );
    }
    throw new Error(`Failed to load OpenAPI schema: ${(error as Error).message}`);
  }
}

/**
 * Get validator function for a specific schema component
 *
 * @param ajv - AJV instance
 * @param schema - Full OpenAPI schema
 * @param componentName - Name of the component schema to validate
 * @returns Validator function for the component
 */
export function getComponentValidator(
  ajv: Ajv,
  schema: Record<string, unknown>,
  componentName: string
): ValidateFunction {
  const componentSchema = (schema.components as any).schemas[componentName];

  if (!componentSchema) {
    throw new Error(
      `Schema component not found: ${componentName}\n` +
      `Available schemas: ${Object.keys((schema.components as any).schemas).join(', ')}`
    );
  }

  // Add the full schema for $ref resolution
  ajv.addSchema(schema, 'openapi');

  // Compile validator for specific component
  const validator = ajv.compile({
    ...componentSchema,
    $schema: 'http://json-schema.org/draft-07/schema#'
  });

  return validator;
}

/**
 * Validate data against a schema component
 *
 * @param data - Data to validate
 * @param componentName - Name of the OpenAPI component schema
 * @returns Validation result with errors if validation fails
 */
export function validateAgainstSchema(
  data: unknown,
  componentName: string
): { valid: boolean; errors?: string[] } {
  try {
    const ajv = createSchemaValidator();
    const schema = loadOpenApiSchema();
    const validator = getComponentValidator(ajv, schema, componentName);

    const valid = validator(data);

    if (!valid && validator.errors) {
      const errors = validator.errors.map(error => {
        const path = error.instancePath || '/';
        const message = error.message || 'Unknown error';
        return `${path}: ${message}`;
      });

      return { valid: false, errors };
    }

    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      errors: [(error as Error).message]
    };
  }
}

/**
 * Validate Investigation Request data
 *
 * Constitutional Compliance:
 * - Validates against generated OpenAPI schema
 * - No hardcoded validation rules
 */
export function validateInvestigationRequest(data: unknown): {
  valid: boolean;
  errors?: string[];
} {
  return validateAgainstSchema(data, 'InvestigationRequest');
}

/**
 * Validate Investigation Response data
 *
 * Constitutional Compliance:
 * - Validates against generated OpenAPI schema
 * - No hardcoded validation rules
 */
export function validateInvestigationResponse(data: unknown): {
  valid: boolean;
  errors?: string[];
} {
  return validateAgainstSchema(data, 'InvestigationResponse');
}

/**
 * Validate Error Response data
 *
 * Constitutional Compliance:
 * - Validates against generated OpenAPI schema
 * - No hardcoded validation rules
 */
export function validateErrorResponse(data: unknown): {
  valid: boolean;
  errors?: string[];
} {
  return validateAgainstSchema(data, 'ErrorResponse');
}
