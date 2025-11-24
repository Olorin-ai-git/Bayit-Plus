/**
 * Relationship Tracking Hook
 * Feature: 004-new-olorin-frontend
 *
 * Manages entity relationship discovery during investigation.
 */

import { useState, useCallback } from 'react';
import type { EntityRelationship } from '@shared/types/relationshipTypes';
import type { LogEntry } from '@shared/components';

/**
 * Hook to manage entity relationships
 */
export function useRelationshipTracking(addLog: (log: LogEntry) => void) {
  const [relationships, setRelationships] = useState<EntityRelationship[]>([]);

  // Add a new relationship
  const addRelationship = useCallback((newRelationship: EntityRelationship) => {
    setRelationships((prev) => {
      // Check if relationship already exists
      const exists = prev.some(
        (r) =>
          (r.sourceEntityId === newRelationship.sourceEntityId &&
           r.targetEntityId === newRelationship.targetEntityId) ||
          (r.sourceEntityId === newRelationship.targetEntityId &&
           r.targetEntityId === newRelationship.sourceEntityId)
      );

      if (exists) {
        return prev;
      }

      // Add log entry
      const log: LogEntry = {
        timestamp: new Date().toISOString(),
        level: 'info',
        message: `Discovered ${newRelationship.relationshipType.replace('_', ' ')} relationship between entities`,
        source: 'relationship_analyzer'
      };
      addLog(log);

      return [...prev, newRelationship];
    });
  }, [addLog]);

  return { relationships, addRelationship };
}
