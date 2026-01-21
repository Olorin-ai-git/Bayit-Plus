#!/usr/bin/env ts-node
/**
 * Breaking Change Detection Script
 *
 * Compares two OpenAPI schemas and detects breaking changes.
 * Used in CI/CD pipeline to prevent accidental breaking changes.
 *
 * Constitutional Compliance:
 * - Schema paths from command-line arguments (no hardcoded paths)
 * - Exit code indicates breaking changes detected (fail-fast)
 * - Clear error messages for each breaking change
 * - No mock data or assumptions
 *
 * Usage:
 *   ts-node scripts/detect-breaking-changes.ts <old-schema.json> <new-schema.json>
 *   npm run api:detect-breaking-changes
 */

import * as fs from 'fs';
import * as path from 'path';

interface OpenApiSchema {
  openapi: string;
  info: { version: string; title: string };
  paths: Record<string, Record<string, any>>;
  components?: {
    schemas?: Record<string, any>;
  };
}

interface BreakingChange {
  type: string;
  severity: 'breaking' | 'warning';
  path: string;
  description: string;
  migration?: string;
}

/**
 * Load OpenAPI schema from file
 *
 * Constitutional Compliance:
 * - File path from argument (no hardcoded path)
 * - Fail-fast if file not found or invalid
 */
function loadSchema(filePath: string): OpenApiSchema {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const schema = JSON.parse(content);

    if (!schema.openapi) {
      throw new Error('Invalid OpenAPI schema: missing "openapi" field');
    }

    return schema;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      console.error(`❌ Schema file not found: ${filePath}`);
      process.exit(1);
    }
    throw error;
  }
}

/**
 * Detect removed endpoints (BREAKING)
 */
function detectRemovedEndpoints(
  oldSchema: OpenApiSchema,
  newSchema: OpenApiSchema
): BreakingChange[] {
  const changes: BreakingChange[] = [];

  for (const [pathKey, methods] of Object.entries(oldSchema.paths)) {
    if (!newSchema.paths[pathKey]) {
      changes.push({
        type: 'endpoint_removed',
        severity: 'breaking',
        path: pathKey,
        description: `Endpoint removed: ${pathKey}`,
        migration: `This endpoint no longer exists. Use alternative endpoint or update client.`
      });
      continue;
    }

    // Check for removed HTTP methods
    for (const method of Object.keys(methods)) {
      if (method === 'parameters') continue; // Skip shared parameters

      if (!newSchema.paths[pathKey][method]) {
        changes.push({
          type: 'method_removed',
          severity: 'breaking',
          path: `${method.toUpperCase()} ${pathKey}`,
          description: `HTTP method removed: ${method.toUpperCase()} ${pathKey}`,
          migration: `This HTTP method is no longer supported. Use alternative method.`
        });
      }
    }
  }

  return changes;
}

/**
 * Detect removed request/response fields (BREAKING)
 */
function detectRemovedFields(
  oldSchema: OpenApiSchema,
  newSchema: OpenApiSchema
): BreakingChange[] {
  const changes: BreakingChange[] = [];

  if (!oldSchema.components?.schemas || !newSchema.components?.schemas) {
    return changes;
  }

  for (const [schemaName, oldSchemaObj] of Object.entries(oldSchema.components.schemas)) {
    const newSchemaObj = newSchema.components.schemas[schemaName];

    if (!newSchemaObj) {
      changes.push({
        type: 'schema_removed',
        severity: 'breaking',
        path: `components.schemas.${schemaName}`,
        description: `Schema removed: ${schemaName}`,
        migration: `Schema no longer exists. Update client types.`
      });
      continue;
    }

    // Check for removed required fields
    if (oldSchemaObj.properties && newSchemaObj.properties) {
      for (const [fieldName, oldField] of Object.entries(oldSchemaObj.properties)) {
        if (!newSchemaObj.properties[fieldName]) {
          const wasRequired = oldSchemaObj.required?.includes(fieldName);
          changes.push({
            type: 'field_removed',
            severity: 'breaking',
            path: `${schemaName}.${fieldName}`,
            description: `Field removed: ${schemaName}.${fieldName}${wasRequired ? ' (was required)' : ''}`,
            migration: `Remove references to ${fieldName} field in client code.`
          });
        }
      }
    }

    // Check for fields becoming required
    const oldRequired = new Set(oldSchemaObj.required || []);
    const newRequired = new Set(newSchemaObj.required || []);

    for (const field of newRequired) {
      if (!oldRequired.has(field)) {
        changes.push({
          type: 'field_now_required',
          severity: 'breaking',
          path: `${schemaName}.${field}`,
          description: `Field now required: ${schemaName}.${field}`,
          migration: `Update client code to always provide ${field} field.`
        });
      }
    }
  }

  return changes;
}

/**
 * Detect changed field types (BREAKING)
 */
function detectTypeChanges(
  oldSchema: OpenApiSchema,
  newSchema: OpenApiSchema
): BreakingChange[] {
  const changes: BreakingChange[] = [];

  if (!oldSchema.components?.schemas || !newSchema.components?.schemas) {
    return changes;
  }

  for (const [schemaName, oldSchemaObj] of Object.entries(oldSchema.components.schemas)) {
    const newSchemaObj = newSchema.components.schemas[schemaName];
    if (!newSchemaObj?.properties || !oldSchemaObj.properties) continue;

    for (const [fieldName, oldField] of Object.entries(oldSchemaObj.properties)) {
      const newField = newSchemaObj.properties[fieldName];
      if (!newField) continue;

      const oldType = (oldField as any).type;
      const newType = (newField as any).type;

      if (oldType && newType && oldType !== newType) {
        changes.push({
          type: 'type_changed',
          severity: 'breaking',
          path: `${schemaName}.${fieldName}`,
          description: `Type changed: ${schemaName}.${fieldName} from ${oldType} to ${newType}`,
          migration: `Update client code to handle ${newType} instead of ${oldType}.`
        });
      }

      // Check for enum value changes
      const oldEnum = (oldField as any).enum;
      const newEnum = (newField as any).enum;

      if (oldEnum && newEnum) {
        const removed = oldEnum.filter((v: any) => !newEnum.includes(v));
        if (removed.length > 0) {
          changes.push({
            type: 'enum_values_removed',
            severity: 'breaking',
            path: `${schemaName}.${fieldName}`,
            description: `Enum values removed: ${removed.join(', ')}`,
            migration: `Update client code to not use removed enum values: ${removed.join(', ')}`
          });
        }
      }
    }
  }

  return changes;
}

/**
 * Detect changed response status codes (BREAKING)
 */
function detectResponseCodeChanges(
  oldSchema: OpenApiSchema,
  newSchema: OpenApiSchema
): BreakingChange[] {
  const changes: BreakingChange[] = [];

  for (const [pathKey, oldMethods] of Object.entries(oldSchema.paths)) {
    const newMethods = newSchema.paths[pathKey];
    if (!newMethods) continue;

    for (const [method, oldOperation] of Object.entries(oldMethods)) {
      if (method === 'parameters') continue;

      const newOperation = newMethods[method];
      if (!newOperation?.responses || !oldOperation.responses) continue;

      // Check for removed success status codes
      for (const statusCode of Object.keys(oldOperation.responses)) {
        if (statusCode.startsWith('2') && !newOperation.responses[statusCode]) {
          changes.push({
            type: 'response_code_removed',
            severity: 'breaking',
            path: `${method.toUpperCase()} ${pathKey}`,
            description: `Response code ${statusCode} removed from ${method.toUpperCase()} ${pathKey}`,
            migration: `Update client to handle different success status code.`
          });
        }
      }
    }
  }

  return changes;
}

/**
 * Detect all breaking changes
 */
function detectBreakingChanges(
  oldSchema: OpenApiSchema,
  newSchema: OpenApiSchema
): BreakingChange[] {
  return [
    ...detectRemovedEndpoints(oldSchema, newSchema),
    ...detectRemovedFields(oldSchema, newSchema),
    ...detectTypeChanges(oldSchema, newSchema),
    ...detectResponseCodeChanges(oldSchema, newSchema)
  ];
}

/**
 * Main execution
 */
function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.error('Usage: ts-node detect-breaking-changes.ts <old-schema.json> <new-schema.json>');
    console.error('');
    console.error('Example:');
    console.error('  ts-node detect-breaking-changes.ts schema-v1.json schema-v2.json');
    process.exit(1);
  }

  const [oldSchemaPath, newSchemaPath] = args;

  console.log('🔍 Detecting breaking changes...');
  console.log(`   Old schema: ${oldSchemaPath}`);
  console.log(`   New schema: ${newSchemaPath}`);
  console.log('');

  const oldSchema = loadSchema(oldSchemaPath);
  const newSchema = loadSchema(newSchemaPath);

  console.log(`✅ Loaded old schema: ${oldSchema.info.title} v${oldSchema.info.version}`);
  console.log(`✅ Loaded new schema: ${newSchema.info.title} v${newSchema.info.version}`);
  console.log('');

  const breakingChanges = detectBreakingChanges(oldSchema, newSchema);

  if (breakingChanges.length === 0) {
    console.log('✅ No breaking changes detected!');
    console.log('');
    console.log('The new schema is backward compatible with the old schema.');
    process.exit(0);
  }

  console.error(`❌ ${breakingChanges.length} breaking change(s) detected:\n`);

  for (const change of breakingChanges) {
    console.error(`🔴 ${change.type.toUpperCase()}`);
    console.error(`   Path: ${change.path}`);
    console.error(`   ${change.description}`);
    if (change.migration) {
      console.error(`   Migration: ${change.migration}`);
    }
    console.error('');
  }

  console.error('⚠️  Breaking changes require a MAJOR version increment (e.g., v1 → v2)');
  console.error('');
  console.error('Next steps:');
  console.error('  1. Review breaking changes above');
  console.error('  2. Update API version number');
  console.error('  3. Create migration guide');
  console.error('  4. Document changes in CHANGELOG.md');
  console.error('');

  process.exit(1);
}

main();
