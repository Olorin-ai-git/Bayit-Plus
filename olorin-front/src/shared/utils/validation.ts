/**
 * Validation Utilities
 * Feature: 004-new-olorin-frontend
 *
 * Validation functions and type guards for investigation wizard.
 */

import { EntityType } from '../types/entities.types';
import { InvestigationSettings } from '../types/wizard.types';
import { ENTITY_VALIDATION_PATTERNS } from '../types/entities.types';

/**
 * Validate investigation settings
 * @param settings - Investigation settings to validate
 * @returns Array of validation error messages (empty if valid)
 */
export function validateInvestigationSettings(
  settings: InvestigationSettings
): string[] {
  const errors: string[] = [];

  // Guard against undefined settings
  if (!settings) {
    errors.push("Investigation settings are required");
    return errors;
  }

  // Entity validation
  // Accept either entities array OR autoSelectEntities flag
  const hasEntities = settings.entities && settings.entities.length > 0;
  const willAutoSelectEntities = (settings as any).autoSelectEntities === true;

  if (!hasEntities && !willAutoSelectEntities) {
    errors.push("At least one entity is required or enable auto-select");
  }

  // Multi-entity validation - only check if entities exist
  if (settings.entities && settings.entities.length > 1 && !settings.primaryEntityId) {
    errors.push("Primary entity must be selected for multi-entity investigations");
  }

  // Time range validation
  if (!settings.timeRange) {
    errors.push("Time range is required");
  } else {
    // Handle multiple field name conventions from TimeRangePicker
    const startStr = (settings.timeRange as any).start || (settings.timeRange as any).startDate || (settings.timeRange as any).start_time;
    const endStr = (settings.timeRange as any).end || (settings.timeRange as any).endDate || (settings.timeRange as any).end_time;

    if (!startStr || !endStr) {
      errors.push("Start and end times are required");
    } else {
      const startDate = new Date(startStr);
      const endDate = new Date(endStr);
      if (endDate <= startDate) {
        errors.push("End date must be after start date");
      }
    }
  }

  // Tool selection validation (check for both toolSelections and tools properties)
  const toolsList = (settings as any).toolSelections || (settings as any).tools || [];

  if (toolsList.length === 0) {
    errors.push("At least one tool must be selected");
  } else {
    const enabledTools = toolsList.filter((t: any) => t.isEnabled || t.enabled);
    if (enabledTools.length === 0) {
      errors.push("At least one tool must be enabled");
    }
  }

  return errors;
}

/**
 * Validate entity value based on entity type
 * @param type - Entity type
 * @param value - Entity value to validate
 * @returns Validation result with error message if invalid
 */
export function validateEntityValue(
  type: EntityType,
  value: string
): { valid: boolean; error?: string } {
  const pattern = ENTITY_VALIDATION_PATTERNS[type];

  switch (type) {
    case EntityType.EMAIL:
      if (!pattern.test(value)) {
        return { valid: false, error: "Invalid email format" };
      }
      return { valid: true };

    case EntityType.IP_ADDRESS:
      if (!pattern.test(value)) {
        return { valid: false, error: "Invalid IP address format" };
      }
      const octets = value.split('.').map(Number);
      if (octets.some(o => o > 255)) {
        return { valid: false, error: "IP address octets must be 0-255" };
      }
      return { valid: true };

    case EntityType.PHONE_NUMBER:
      if (!pattern.test(value)) {
        return { valid: false, error: "Invalid phone number format" };
      }
      return { valid: true };

    case EntityType.USER_ID:
    case EntityType.DEVICE_ID:
    case EntityType.TRANSACTION_ID:
    case EntityType.ACCOUNT_ID:
      if (!value.trim()) {
        return { valid: false, error: "Value cannot be empty" };
      }
      return { valid: true };

    default:
      return { valid: false, error: "Unknown entity type" };
  }
}

/**
 * Validate time range
 * @param startDate - Start date ISO string
 * @param endDate - End date ISO string
 * @returns Validation result
 */
export function validateTimeRange(
  startDate: string,
  endDate: string
): { valid: boolean; error?: string } {
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (isNaN(start.getTime())) {
    return { valid: false, error: "Invalid start date" };
  }

  if (isNaN(end.getTime())) {
    return { valid: false, error: "Invalid end date" };
  }

  if (end <= start) {
    return { valid: false, error: "End date must be after start date" };
  }

  return { valid: true };
}

/**
 * Validate risk threshold
 * @param threshold - Risk threshold (0-100)
 * @returns Validation result
 */
export function validateRiskThreshold(
  threshold: number
): { valid: boolean; error?: string } {
  if (threshold < 0 || threshold > 100) {
    return { valid: false, error: "Risk threshold must be between 0 and 100" };
  }
  return { valid: true };
}

/**
 * Validate UUID format
 * @param uuid - UUID string to validate
 * @returns true if valid UUID format
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}
