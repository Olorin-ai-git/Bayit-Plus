#!/usr/bin/env ts-node
/**
 * OpenAPI Schema Comparison Tool
 *
 * Generates detailed diff between two OpenAPI schemas.
 * Produces human-readable reports with changes categorized by severity.
 *
 * Constitutional Compliance:
 * - Schema paths from command-line arguments (no hardcoded paths)
 * - Output format from environment (HTML, JSON, Markdown)
 * - All comparisons based on actual schemas (no assumptions)
 *
 * Usage:
 *   ts-node scripts/compare-schemas.ts <old-schema.json> <new-schema.json> [--format=html|json|markdown]
 *   npm run api:compare-schemas
 */

import * as fs from 'fs';
import * as path from 'path';

interface SchemaChange {
  type: 'added' | 'removed' | 'modified';
  severity: 'breaking' | 'non-breaking' | 'info';
  category: 'endpoint' | 'schema' | 'field' | 'type' | 'enum' | 'response';
  path: string;
  oldValue?: any;
  newValue?: any;
  description: string;
}

interface ComparisonReport {
  summary: {
    totalChanges: number;
    breakingChanges: number;
    nonBreakingChanges: number;
    oldVersion: string;
    newVersion: string;
  };
  changes: SchemaChange[];
  timestamp: string;
}

/**
 * Load OpenAPI schema from file
 */
function loadSchema(filePath: string): any {
  const content = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(content);
}

/**
 * Compare endpoints
 */
function compareEndpoints(oldSchema: any, newSchema: any): SchemaChange[] {
  const changes: SchemaChange[] = [];
  const oldPaths = new Set(Object.keys(oldSchema.paths || {}));
  const newPaths = new Set(Object.keys(newSchema.paths || {}));

  // Removed endpoints
  for (const pathKey of oldPaths) {
    if (!newPaths.has(pathKey)) {
      const methods = Object.keys(oldSchema.paths[pathKey])
        .filter(m => m !== 'parameters');
      changes.push({
        type: 'removed',
        severity: 'breaking',
        category: 'endpoint',
        path: pathKey,
        oldValue: methods,
        description: `Endpoint removed: ${pathKey} (${methods.join(', ').toUpperCase()})`
      });
    }
  }

  // Added endpoints
  for (const pathKey of newPaths) {
    if (!oldPaths.has(pathKey)) {
      const methods = Object.keys(newSchema.paths[pathKey])
        .filter(m => m !== 'parameters');
      changes.push({
        type: 'added',
        severity: 'non-breaking',
        category: 'endpoint',
        path: pathKey,
        newValue: methods,
        description: `Endpoint added: ${pathKey} (${methods.join(', ').toUpperCase()})`
      });
    }
  }

  // Modified endpoints (method changes)
  for (const pathKey of oldPaths) {
    if (newPaths.has(pathKey)) {
      const oldMethods = new Set(
        Object.keys(oldSchema.paths[pathKey]).filter(m => m !== 'parameters')
      );
      const newMethods = new Set(
        Object.keys(newSchema.paths[pathKey]).filter(m => m !== 'parameters')
      );

      // Removed methods
      for (const method of oldMethods) {
        if (!newMethods.has(method)) {
          changes.push({
            type: 'removed',
            severity: 'breaking',
            category: 'endpoint',
            path: `${method.toUpperCase()} ${pathKey}`,
            oldValue: method,
            description: `HTTP method removed: ${method.toUpperCase()} ${pathKey}`
          });
        }
      }

      // Added methods
      for (const method of newMethods) {
        if (!oldMethods.has(method)) {
          changes.push({
            type: 'added',
            severity: 'non-breaking',
            category: 'endpoint',
            path: `${method.toUpperCase()} ${pathKey}`,
            newValue: method,
            description: `HTTP method added: ${method.toUpperCase()} ${pathKey}`
          });
        }
      }
    }
  }

  return changes;
}

/**
 * Compare schemas (data models)
 */
function compareSchemas(oldSchema: any, newSchema: any): SchemaChange[] {
  const changes: SchemaChange[] = [];

  const oldSchemas = oldSchema.components?.schemas || {};
  const newSchemas = newSchema.components?.schemas || {};

  const oldSchemaNames = new Set(Object.keys(oldSchemas));
  const newSchemaNames = new Set(Object.keys(newSchemas));

  // Removed schemas
  for (const name of oldSchemaNames) {
    if (!newSchemaNames.has(name)) {
      changes.push({
        type: 'removed',
        severity: 'breaking',
        category: 'schema',
        path: `components.schemas.${name}`,
        description: `Schema removed: ${name}`
      });
    }
  }

  // Added schemas
  for (const name of newSchemaNames) {
    if (!oldSchemaNames.has(name)) {
      changes.push({
        type: 'added',
        severity: 'info',
        category: 'schema',
        path: `components.schemas.${name}`,
        description: `Schema added: ${name}`
      });
    }
  }

  // Modified schemas
  for (const name of oldSchemaNames) {
    if (newSchemaNames.has(name)) {
      changes.push(...compareSchemaFields(name, oldSchemas[name], newSchemas[name]));
    }
  }

  return changes;
}

/**
 * Compare fields within a schema
 */
function compareSchemaFields(schemaName: string, oldDef: any, newDef: any): SchemaChange[] {
  const changes: SchemaChange[] = [];

  const oldProps = oldDef.properties || {};
  const newProps = newDef.properties || {};

  const oldFields = new Set(Object.keys(oldProps));
  const newFields = new Set(Object.keys(newProps));

  // Removed fields
  for (const field of oldFields) {
    if (!newFields.has(field)) {
      const wasRequired = oldDef.required?.includes(field);
      changes.push({
        type: 'removed',
        severity: 'breaking',
        category: 'field',
        path: `${schemaName}.${field}`,
        oldValue: oldProps[field],
        description: `Field removed: ${schemaName}.${field}${wasRequired ? ' (was required)' : ''}`
      });
    }
  }

  // Added fields
  for (const field of newFields) {
    if (!oldFields.has(field)) {
      const isRequired = newDef.required?.includes(field);
      changes.push({
        type: 'added',
        severity: isRequired ? 'breaking' : 'non-breaking',
        category: 'field',
        path: `${schemaName}.${field}`,
        newValue: newProps[field],
        description: `Field added: ${schemaName}.${field}${isRequired ? ' (required)' : ' (optional)'}`
      });
    }
  }

  // Field type changes
  for (const field of oldFields) {
    if (newFields.has(field)) {
      const oldType = oldProps[field].type;
      const newType = newProps[field].type;

      if (oldType !== newType) {
        changes.push({
          type: 'modified',
          severity: 'breaking',
          category: 'type',
          path: `${schemaName}.${field}`,
          oldValue: oldType,
          newValue: newType,
          description: `Type changed: ${schemaName}.${field} from ${oldType} to ${newType}`
        });
      }

      // Enum changes
      const oldEnum = oldProps[field].enum;
      const newEnum = newProps[field].enum;

      if (oldEnum && newEnum) {
        const removed = oldEnum.filter((v: any) => !newEnum.includes(v));
        const added = newEnum.filter((v: any) => !oldEnum.includes(v));

        if (removed.length > 0) {
          changes.push({
            type: 'removed',
            severity: 'breaking',
            category: 'enum',
            path: `${schemaName}.${field}`,
            oldValue: removed,
            description: `Enum values removed: ${removed.join(', ')}`
          });
        }

        if (added.length > 0) {
          changes.push({
            type: 'added',
            severity: 'non-breaking',
            category: 'enum',
            path: `${schemaName}.${field}`,
            newValue: added,
            description: `Enum values added: ${added.join(', ')}`
          });
        }
      }
    }
  }

  // Required field changes
  const oldRequired = new Set(oldDef.required || []);
  const newRequired = new Set(newDef.required || []);

  for (const field of newRequired) {
    if (!oldRequired.has(field) && oldFields.has(field)) {
      changes.push({
        type: 'modified',
        severity: 'breaking',
        category: 'field',
        path: `${schemaName}.${field}`,
        oldValue: false,
        newValue: true,
        description: `Field now required: ${schemaName}.${field}`
      });
    }
  }

  for (const field of oldRequired) {
    if (!newRequired.has(field) && newFields.has(field)) {
      changes.push({
        type: 'modified',
        severity: 'non-breaking',
        category: 'field',
        path: `${schemaName}.${field}`,
        oldValue: true,
        newValue: false,
        description: `Field now optional: ${schemaName}.${field}`
      });
    }
  }

  return changes;
}

/**
 * Generate comparison report
 */
function generateReport(oldSchema: any, newSchema: any): ComparisonReport {
  const changes: SchemaChange[] = [
    ...compareEndpoints(oldSchema, newSchema),
    ...compareSchemas(oldSchema, newSchema)
  ];

  const breakingChanges = changes.filter(c => c.severity === 'breaking').length;
  const nonBreakingChanges = changes.filter(c => c.severity === 'non-breaking').length;

  return {
    summary: {
      totalChanges: changes.length,
      breakingChanges,
      nonBreakingChanges,
      oldVersion: oldSchema.info?.version || 'unknown',
      newVersion: newSchema.info?.version || 'unknown'
    },
    changes: changes.sort((a, b) => {
      // Sort by severity (breaking first), then by type
      const severityOrder = { breaking: 0, 'non-breaking': 1, info: 2 };
      if (severityOrder[a.severity] !== severityOrder[b.severity]) {
        return severityOrder[a.severity] - severityOrder[b.severity];
      }
      return a.path.localeCompare(b.path);
    }),
    timestamp: new Date().toISOString()
  };
}

/**
 * Format report as Markdown
 */
function formatMarkdown(report: ComparisonReport): string {
  let md = `# API Schema Comparison Report\n\n`;
  md += `**Generated**: ${report.timestamp}\n\n`;
  md += `## Summary\n\n`;
  md += `- **Old Version**: ${report.summary.oldVersion}\n`;
  md += `- **New Version**: ${report.summary.newVersion}\n`;
  md += `- **Total Changes**: ${report.summary.totalChanges}\n`;
  md += `- **Breaking Changes**: ⚠️ ${report.summary.breakingChanges}\n`;
  md += `- **Non-Breaking Changes**: ✅ ${report.summary.nonBreakingChanges}\n\n`;

  if (report.changes.length === 0) {
    md += `✅ **No changes detected**\n\n`;
    return md;
  }

  md += `## Changes\n\n`;

  const breaking = report.changes.filter(c => c.severity === 'breaking');
  const nonBreaking = report.changes.filter(c => c.severity === 'non-breaking');
  const info = report.changes.filter(c => c.severity === 'info');

  if (breaking.length > 0) {
    md += `### ⚠️ Breaking Changes (${breaking.length})\n\n`;
    for (const change of breaking) {
      md += `- **${change.category}** [${change.type}] ${change.path}\n`;
      md += `  - ${change.description}\n`;
      if (change.oldValue !== undefined) md += `  - Old: \`${JSON.stringify(change.oldValue)}\`\n`;
      if (change.newValue !== undefined) md += `  - New: \`${JSON.stringify(change.newValue)}\`\n`;
      md += `\n`;
    }
  }

  if (nonBreaking.length > 0) {
    md += `### ✅ Non-Breaking Changes (${nonBreaking.length})\n\n`;
    for (const change of nonBreaking) {
      md += `- **${change.category}** [${change.type}] ${change.path}\n`;
      md += `  - ${change.description}\n`;
      md += `\n`;
    }
  }

  if (info.length > 0) {
    md += `### ℹ️ Informational Changes (${info.length})\n\n`;
    for (const change of info) {
      md += `- **${change.category}** [${change.type}] ${change.path}\n`;
      md += `  - ${change.description}\n`;
      md += `\n`;
    }
  }

  return md;
}

/**
 * Main execution
 */
function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.error('Usage: ts-node compare-schemas.ts <old-schema.json> <new-schema.json> [--format=html|json|markdown]');
    process.exit(1);
  }

  const [oldSchemaPath, newSchemaPath] = args;
  const format = args.find(a => a.startsWith('--format='))?.split('=')[1] || 'markdown';

  console.log('📊 Comparing OpenAPI schemas...');
  console.log(`   Old: ${oldSchemaPath}`);
  console.log(`   New: ${newSchemaPath}`);
  console.log('');

  const oldSchema = loadSchema(oldSchemaPath);
  const newSchema = loadSchema(newSchemaPath);

  const report = generateReport(oldSchema, newSchema);

  console.log('📈 Comparison Summary:');
  console.log(`   Old Version: ${report.summary.oldVersion}`);
  console.log(`   New Version: ${report.summary.newVersion}`);
  console.log(`   Total Changes: ${report.summary.totalChanges}`);
  console.log(`   Breaking: ${report.summary.breakingChanges}`);
  console.log(`   Non-Breaking: ${report.summary.nonBreakingChanges}`);
  console.log('');

  if (format === 'markdown') {
    const markdown = formatMarkdown(report);
    console.log(markdown);
  } else if (format === 'json') {
    console.log(JSON.stringify(report, null, 2));
  }

  // Exit with error code if breaking changes detected
  process.exit(report.summary.breakingChanges > 0 ? 1 : 0);
}

main();
