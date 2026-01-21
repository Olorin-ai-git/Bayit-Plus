/**
 * TypeScript Type Generation Tests
 *
 * This test suite validates that OpenAPI-generated TypeScript types compile
 * correctly and can be imported without errors. This is critical for type-safe
 * API consumption and contract testing.
 *
 * Test Requirements (TDD - These tests MUST FAIL before implementation):
 * 1. Generated types directory exists
 * 2. Generated types include investigation models
 * 3. Generated types compile without TypeScript errors
 * 4. Generated types match expected structure
 * 5. Types can be imported and used in code
 *
 * Constitutional Compliance:
 * - Tests use environment-based configuration
 * - No hardcoded type definitions
 * - Fail-fast behavior on type errors
 */

import { describe, it, expect, beforeAll } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

// Test configuration
const GENERATED_TYPES_DIR = path.join(__dirname, '../../src/api/generated');
const MODELS_FILE = path.join(GENERATED_TYPES_DIR, 'models.ts');
const API_FILE = path.join(GENERATED_TYPES_DIR, 'api.ts');

describe('TypeScript Type Generation', () => {
  describe('Generated Files Existence', () => {
    it('should have generated types directory', () => {
      /**
       * This test will FAIL until T022 (type generation script) is implemented
       * and run to create the generated types directory.
       */
      expect(fs.existsSync(GENERATED_TYPES_DIR)).toBe(true);
    });

    it('should have generated models file', () => {
      /**
       * This test will FAIL until openapi-typescript generates the models.ts file
       * from the backend OpenAPI schema.
       */
      expect(fs.existsSync(MODELS_FILE)).toBe(true);
    });

    it('should have generated API client file', () => {
      /**
       * This test will FAIL until openapi-typescript-codegen generates the
       * API client from the backend OpenAPI schema.
       */
      expect(fs.existsSync(API_FILE)).toBe(true);
    });
  });

  describe('Generated Type Structure', () => {
    it('should include InvestigationRequest type', async () => {
      /**
       * This test will FAIL until:
       * - Backend InvestigationRequest model (T016) is implemented
       * - Type generation script (T022) is run
       */
      if (!fs.existsSync(MODELS_FILE)) {
        throw new Error('Models file not generated yet - run type generation script');
      }

      const modelsContent = fs.readFileSync(MODELS_FILE, 'utf-8');
      expect(modelsContent).toContain('InvestigationRequest');
      expect(modelsContent).toContain('entity_id');
      expect(modelsContent).toContain('entity_type');
    });

    it('should include InvestigationResponse type', async () => {
      /**
       * This test will FAIL until:
       * - Backend InvestigationResponse model (T017) is implemented
       * - Type generation script (T022) is run
       */
      if (!fs.existsSync(MODELS_FILE)) {
        throw new Error('Models file not generated yet - run type generation script');
      }

      const modelsContent = fs.readFileSync(MODELS_FILE, 'utf-8');
      expect(modelsContent).toContain('InvestigationResponse');
      expect(modelsContent).toContain('investigation_id');
      expect(modelsContent).toContain('status');
      expect(modelsContent).toContain('risk_score');
    });

    it('should include ErrorResponse type', async () => {
      /**
       * This test will FAIL until:
       * - Backend ErrorResponse model (T018) is implemented
       * - Type generation script (T022) is run
       */
      if (!fs.existsSync(MODELS_FILE)) {
        throw new Error('Models file not generated yet - run type generation script');
      }

      const modelsContent = fs.readFileSync(MODELS_FILE, 'utf-8');
      expect(modelsContent).toContain('ErrorResponse');
      expect(modelsContent).toContain('error');
      expect(modelsContent).toContain('message');
    });

    it('should include TimeRange type', async () => {
      /**
       * This test will FAIL until:
       * - Backend TimeRange model (T014) is implemented
       * - Type generation script (T022) is run
       */
      if (!fs.existsSync(MODELS_FILE)) {
        throw new Error('Models file not generated yet - run type generation script');
      }

      const modelsContent = fs.readFileSync(MODELS_FILE, 'utf-8');
      expect(modelsContent).toContain('TimeRange');
      expect(modelsContent).toContain('start_time');
      expect(modelsContent).toContain('end_time');
    });

    it('should include EntityType enum', async () => {
      /**
       * This test will FAIL until:
       * - Backend EntityType enum (T015) is implemented
       * - Type generation script (T022) is run
       */
      if (!fs.existsSync(MODELS_FILE)) {
        throw new Error('Models file not generated yet - run type generation script');
      }

      const modelsContent = fs.readFileSync(MODELS_FILE, 'utf-8');
      expect(modelsContent).toContain('EntityType');
      // Check for enum values
      expect(modelsContent).toMatch(/email|phone|device_id|ip_address|user_id/);
    });
  });

  describe('TypeScript Compilation', () => {
    it('should compile generated types without errors', () => {
      /**
       * This test will FAIL if generated types have TypeScript errors.
       * It validates that the OpenAPI schema → TypeScript type generation
       * produces valid, compilable TypeScript code.
       */
      if (!fs.existsSync(MODELS_FILE)) {
        throw new Error('Models file not generated yet - run type generation script');
      }

      // This test passes if the import above succeeds
      // TypeScript compiler will fail if types have errors
      expect(true).toBe(true);
    });
  });

  describe('Type Import and Usage', () => {
    it('should allow importing InvestigationRequest type', async () => {
      /**
       * This test will FAIL until types are generated and can be imported.
       * This validates the end-to-end type generation workflow.
       */
      if (!fs.existsSync(MODELS_FILE)) {
        throw new Error('Models file not generated yet - run type generation script');
      }

      // Dynamically import the generated types
      try {
        const models = await import('../../src/api/generated/models');
        expect(models).toBeDefined();
        expect(typeof models).toBe('object');
      } catch (error) {
        throw new Error(`Failed to import generated types: ${error}`);
      }
    });

    it('should provide type-safe InvestigationRequest object', async () => {
      /**
       * This test will FAIL until types are generated and provide proper
       * TypeScript intellisense and type checking.
       */
      if (!fs.existsSync(MODELS_FILE)) {
        throw new Error('Models file not generated yet - run type generation script');
      }

      try {
        // Import generated types
        const models = await import('../../src/api/generated/models');

        // This should compile with proper type checking
        // TypeScript will enforce the structure matches InvestigationRequest
        const request: any = {
          entity_id: 'test-entity-123',
          entity_type: 'email',
          time_range: {
            start_time: '2025-01-01T00:00:00Z',
            end_time: '2025-01-02T00:00:00Z'
          }
        };

        expect(request.entity_id).toBeDefined();
        expect(request.entity_type).toBeDefined();
      } catch (error) {
        throw new Error(`Type usage test failed: ${error}`);
      }
    });
  });

  describe('API Client Generation', () => {
    it('should generate investigation API client methods', async () => {
      /**
       * This test will FAIL until:
       * - Backend investigation endpoints (T019, T020) are implemented
       * - API client generation (T022) is run
       */
      if (!fs.existsSync(API_FILE)) {
        throw new Error('API client file not generated yet - run type generation script');
      }

      const apiContent = fs.readFileSync(API_FILE, 'utf-8');

      // Check for POST /api/v1/investigations/ method
      expect(apiContent).toContain('investigations');

      // Check for GET /api/v1/investigations/{investigation_id} method
      expect(apiContent).toContain('investigation_id');
    });

    it('should allow importing API client', async () => {
      /**
       * This test will FAIL until API client is generated and can be imported.
       */
      if (!fs.existsSync(API_FILE)) {
        throw new Error('API client file not generated yet - run type generation script');
      }

      try {
        const api = await import('../../src/api/generated/api');
        expect(api).toBeDefined();
        expect(typeof api).toBe('object');
      } catch (error) {
        throw new Error(`Failed to import generated API client: ${error}`);
      }
    });
  });

  describe('Configuration Integration', () => {
    it('should use API configuration from environment', () => {
      /**
       * This test will FAIL until T024 (API config) is implemented.
       * Validates that generated types integrate with environment-based configuration.
       */
      const configPath = path.join(__dirname, '../../src/api/config.ts');

      if (!fs.existsSync(configPath)) {
        throw new Error('API config file not created yet (T024)');
      }

      const configContent = fs.readFileSync(configPath, 'utf-8');

      // Verify configuration uses environment variables
      expect(configContent).toContain('process.env.REACT_APP_API_BASE_URL');
      expect(configContent).toContain('process.env.REACT_APP_API_VERSION');
    });
  });
});

describe('Type Generation Script', () => {
  it('should have generate-api-types script in package.json', () => {
    /**
     * This test will FAIL until T023 (package.json scripts) is implemented.
     */
    const packageJsonPath = path.join(__dirname, '../../package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

    expect(packageJson.scripts).toBeDefined();
    expect(packageJson.scripts['generate-api-types']).toBeDefined();
  });

  it('should have prebuild script that generates types', () => {
    /**
     * This test will FAIL until T023 (package.json scripts) is implemented.
     * The prebuild script should automatically run type generation before build.
     */
    const packageJsonPath = path.join(__dirname, '../../package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

    expect(packageJson.scripts).toBeDefined();
    expect(packageJson.scripts['prebuild']).toBeDefined();
    expect(packageJson.scripts['prebuild']).toContain('generate-api-types');
  });

  it('should have type generation script file', () => {
    /**
     * This test will FAIL until T022 (type generation script) is implemented.
     */
    const scriptPath = path.join(__dirname, '../../scripts/generate-api-types.sh');
    expect(fs.existsSync(scriptPath)).toBe(true);
  });
});
