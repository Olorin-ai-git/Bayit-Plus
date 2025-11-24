/**
 * Graph Entity Mapper
 * Feature: 004-new-olorin-frontend
 *
 * Pure function to convert WizardEntity to GraphEntity format.
 * No side effects, fully testable.
 */

import type { WizardEntity } from '@shared/types/wizard.types';
import type { GraphEntity } from '@shared/components/LiveRelationshipGraph';

/**
 * Convert wizard entities to graph entity format
 */
export function mapEntitiesToGraph(entities: WizardEntity[]): GraphEntity[] {
  return entities.map((entity) => ({
    id: entity.id,
    displayLabel: entity.displayLabel,
    value: entity.value
  }));
}
