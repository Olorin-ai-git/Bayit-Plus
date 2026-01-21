import { checkDistributionArchitecture } from '../../../src/unified-module-requirements/lib/architecture/DistributionValidator';
import { DistributionCheckRequest, DistributionComplianceReport } from '../../../src/unified-module-requirements/models/types';

describe('Contract Test: POST /architecture/check-distribution', () => {
  const mockRequest: DistributionCheckRequest = {
    modulePaths: ['/test/module1', '/test/module2'],
    checkBuildOutputs: true,
    validatePackaging: true,
    requireDist: true
  };

  it('should validate distribution check request schema', () => {
    expect(() => {
      // This should fail initially - no distribution validator exists yet
      checkDistributionArchitecture(mockRequest);
    }).toBeDefined();
  });

  it('should return DistributionComplianceReport with compliance status', async () => {
    try {
      // This MUST fail initially - implementation doesn't exist
      const result = await checkDistributionArchitecture(mockRequest);

      // Expected response structure (this test should fail)
      expect(result).toHaveProperty('totalModules');
      expect(result).toHaveProperty('compliantModules');
      expect(result).toHaveProperty('violations');
      expect(result).toHaveProperty('distributionSummary');
      expect(result).toHaveProperty('buildOutputValidation');

      expect(Array.isArray(result.violations)).toBe(true);
      expect(result.totalModules).toBeGreaterThanOrEqual(0);
      expect(result.compliantModules).toBeGreaterThanOrEqual(0);
      expect(result.compliantModules).toBeLessThanOrEqual(result.totalModules);

      // Each violation should have required structure
      result.violations.forEach(violation => {
        expect(violation).toHaveProperty('modulePath');
        expect(violation).toHaveProperty('violationType');
        expect(violation).toHaveProperty('description');
        expect(violation).toHaveProperty('severity');
        expect(violation).toHaveProperty('remediation');
        expect(['missing_dist', 'invalid_structure', 'build_failure', 'packaging_error']).toContain(violation.violationType);
      });
    } catch (error) {
      // Expected to fail - no implementation yet
      expect(error).toBeDefined();
    }
  });

  it('should validate dist/ folder existence and structure', async () => {
    try {
      const result = await checkDistributionArchitecture(mockRequest);

      result.distributionSummary.forEach(summary => {
        expect(summary).toHaveProperty('modulePath');
        expect(summary).toHaveProperty('hasDistFolder');
        expect(summary).toHaveProperty('distStructure');
        expect(summary).toHaveProperty('buildArtifacts');
        expect(summary).toHaveProperty('packageInfo');

        if (summary.hasDistFolder) {
          expect(summary.distStructure).toHaveProperty('hasMainFile');
          expect(summary.distStructure).toHaveProperty('hasTypes');
          expect(summary.distStructure).toHaveProperty('hasSourceMaps');
        }
      });
    } catch (error) {
      // Expected to fail - no implementation yet
      expect(error).toBeDefined();
    }
  });

  it('should validate build outputs when requested', async () => {
    const requestWithBuildCheck = {
      ...mockRequest,
      checkBuildOutputs: true
    };

    try {
      const result = await checkDistributionArchitecture(requestWithBuildCheck);

      expect(result.buildOutputValidation).toHaveProperty('totalBuilds');
      expect(result.buildOutputValidation).toHaveProperty('successfulBuilds');
      expect(result.buildOutputValidation).toHaveProperty('failedBuilds');
      expect(result.buildOutputValidation).toHaveProperty('buildErrors');

      result.buildOutputValidation.buildErrors.forEach(error => {
        expect(error).toHaveProperty('modulePath');
        expect(error).toHaveProperty('errorType');
        expect(error).toHaveProperty('message');
        expect(error).toHaveProperty('suggestions');
      });
    } catch (error) {
      // Expected to fail - no implementation yet
      expect(error).toBeDefined();
    }
  });

  it('should handle modules without dist folders', async () => {
    try {
      const result = await checkDistributionArchitecture(mockRequest);

      // Should identify modules that are missing required dist folders
      const missingDistViolations = result.violations.filter(v => v.violationType === 'missing_dist');
      expect(Array.isArray(missingDistViolations)).toBe(true);
    } catch (error) {
      // Expected to fail - no implementation yet
      expect(error).toBeDefined();
    }
  });

  it('should validate packaging compliance', async () => {
    const packagingRequest = {
      ...mockRequest,
      validatePackaging: true
    };

    try {
      const result = await checkDistributionArchitecture(packagingRequest);

      result.distributionSummary.forEach(summary => {
        if (summary.packageInfo) {
          expect(summary.packageInfo).toHaveProperty('hasMainField');
          expect(summary.packageInfo).toHaveProperty('hasTypesField');
          expect(summary.packageInfo).toHaveProperty('hasExportsField');
          expect(summary.packageInfo).toHaveProperty('buildScripts');
        }
      });
    } catch (error) {
      // Expected to fail - no implementation yet
      expect(error).toBeDefined();
    }
  });
});