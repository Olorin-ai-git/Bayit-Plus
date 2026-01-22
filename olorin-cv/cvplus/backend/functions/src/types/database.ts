/**
 * Base Database Document Types
 *
 * Common fields for all MongoDB documents in CVPlus
 */

/**
 * Base Document Interface
 *
 * All MongoDB documents extend this base to ensure:
 * - Optimistic concurrency control (version field)
 * - Audit timestamps (createdAt, updatedAt)
 * - Consistent typing across all collections
 */
export interface BaseDocument {
  /**
   * Document version for optimistic concurrency control
   * Incremented on every update to detect concurrent modifications
   */
  version: number;

  /**
   * Document creation timestamp
   * Set once when document is first created
   */
  createdAt: Date;

  /**
   * Document last update timestamp
   * Updated on every document modification
   */
  updatedAt: Date;
}

/**
 * Type guard to check if an object is a BaseDocument
 */
export function isBaseDocument(obj: unknown): obj is BaseDocument {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'version' in obj &&
    typeof (obj as BaseDocument).version === 'number' &&
    'createdAt' in obj &&
    (obj as BaseDocument).createdAt instanceof Date &&
    'updatedAt' in obj &&
    (obj as BaseDocument).updatedAt instanceof Date
  );
}

/**
 * Helper to create initial BaseDocument fields for new documents
 */
export function createBaseDocumentFields(): BaseDocument {
  const now = new Date();
  return {
    version: 1,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Helper to update BaseDocument fields on modification
 */
export function updateBaseDocumentFields(
  currentVersion: number
): Partial<BaseDocument> {
  return {
    version: currentVersion + 1,
    updatedAt: new Date(),
  };
}
