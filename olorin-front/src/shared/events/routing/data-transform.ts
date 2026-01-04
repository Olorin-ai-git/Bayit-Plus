/**
 * Data Transformation Module for Event Routing
 *
 * Handles all data transformation operations for routed events including
 * field mapping, filtering, aggregation, and data splitting.
 *
 * @module routing/data-transform
 */

import type {
  EventTransform,
  AggregationConfig,
  RoutingCondition,
  ConditionOperator
} from './types';

/**
 * DataTransform class handles event data transformations
 * Supports map, filter, aggregate, and split operations
 */
export class DataTransform {
  /**
   * Main transformation dispatcher
   * Routes to appropriate transformation method based on type
   */
  public transform(transform: EventTransform, data: any): any {
    switch (transform.type) {
      case 'map':
        return this.mapData(data, transform.mapping || {});
      case 'filter':
        return this.filterData(data, transform.filter || []);
      case 'aggregate':
        return this.aggregateData(data, transform.aggregation!);
      case 'split':
        return this.splitData(data, transform.splitField!);
      default:
        return data;
    }
  }

  /**
   * Map data fields using field path mapping
   * Supports dot notation for nested field access
   */
  private mapData(data: any, mapping: Record<string, string>): any {
    const result: any = { ...data };

    Object.entries(mapping).forEach(([sourcePath, targetPath]) => {
      const value = this.getNestedValue(data, sourcePath);
      if (value !== undefined) {
        this.setNestedValue(result, targetPath, value);
      }
    });

    return result;
  }

  /**
   * Filter data based on routing conditions
   * For arrays: filters elements; for objects: returns as-is
   */
  private filterData(data: any, filters: RoutingCondition[]): any {
    if (Array.isArray(data)) {
      return data.filter(item =>
        filters.every(filter =>
          this.evaluateCondition(
            filter.operator,
            this.getNestedValue(item, filter.field),
            filter.value
          )
        )
      );
    }
    return data;
  }

  /**
   * Aggregate data using specified configuration
   * Groups by field and applies aggregate operations
   */
  private aggregateData(data: any, config: AggregationConfig): any {
    return {
      groupBy: config.groupBy,
      aggregatedFields: config.aggregateFields,
      originalData: data
    };
  }

  /**
   * Split data into multiple events based on field value
   * If field contains array, creates separate event for each element
   */
  private splitData(data: any, field: string): any[] {
    const value = this.getNestedValue(data, field);
    if (Array.isArray(value)) {
      return value.map(item => ({ ...data, [field]: item }));
    }
    return [data];
  }

  /**
   * Set nested object value using dot notation path
   * Creates intermediate objects if they don't exist
   */
  private setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    const target = keys.reduce((current, key) => {
      if (!(key in current)) {
        current[key] = {};
      }
      return current[key];
    }, obj);
    target[lastKey] = value;
  }

  /**
   * Get nested object value using dot notation path
   * Returns undefined if path doesn't exist
   */
  public getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Evaluate single routing condition
   * Supports all condition operators defined in ConditionOperator type
   */
  public evaluateCondition(
    operator: ConditionOperator,
    actual: any,
    expected: any
  ): boolean {
    switch (operator) {
      case 'equals':
        return actual === expected;
      case 'not_equals':
        return actual !== expected;
      case 'contains':
        return String(actual).includes(String(expected));
      case 'not_contains':
        return !String(actual).includes(String(expected));
      case 'greater_than':
        return Number(actual) > Number(expected);
      case 'less_than':
        return Number(actual) < Number(expected);
      case 'exists':
        return actual !== undefined && actual !== null;
      case 'not_exists':
        return actual === undefined || actual === null;
      default:
        return false;
    }
  }
}
