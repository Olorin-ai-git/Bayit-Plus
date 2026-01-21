import { https } from 'firebase-functions';
import { ModuleRecoveryService } from './services/ModuleRecoveryService';
import { PhaseOrchestrationService } from './services/PhaseOrchestrationService';
import { logger } from '@cvplus/logging';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * POST /modules/{moduleId}/test
 * Triggers test execution for a specific module and updates recovery state
 *
 * @param moduleId - The module identifier
 * @param body - Test options (coverage, watch, specific test files)
 * @returns Test results and updated module state
 */
export const testModule = https.onRequest(async (req, res) => {
  try {
    // CORS headers
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }

    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    const moduleId = req.params.moduleId || req.query.moduleId as string;

    if (!moduleId) {
      res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'moduleId parameter is required'
      });
      return;
    }

    // Validate moduleId against allowed Level 2 modules
    const validModules = [
      'auth', 'i18n', 'processing', 'multimedia', 'analytics',
      'premium', 'public-profiles', 'recommendations', 'admin',
      'workflow', 'payments'
    ];

    if (!validModules.includes(moduleId)) {
      res.status(400).json({
        success: false,
        error: 'Invalid module',
        message: `Module '${moduleId}' is not a valid Level 2 module`,
        validModules
      });
      return;
    }

    const testOptions = req.body || {};
    const coverage = testOptions.coverage || true;
    const watch = testOptions.watch || false;
    const testFiles = testOptions.testFiles || '';

    logger.info(`testModule: Starting test execution for module: ${moduleId}`, { testOptions });

    const moduleService = new ModuleRecoveryService();
    const orchestrationService = new PhaseOrchestrationService();

    // Get current module state
    const currentState = await moduleService.getModuleState(moduleId);
    if (!currentState) {
      res.status(404).json({
        success: false,
        error: 'Module not found',
        message: `Module '${moduleId}' state not found`
      });
      return;
    }

    // Update state to testing
    await moduleService.updateModuleState(moduleId, {
      testStatus: 'running',
      lastTestRun: new Date().toISOString()
    });

    let testResult;
    let testSuccess = false;
    let testOutput = '';
    let passedTests = 0;
    let failedTests = 0;
    let totalTests = 0;
    let coveragePercent = 0;

    try {
      // Determine test command based on module and options
      const modulePath = `packages/${moduleId}`;
      let testCommand = `cd ${modulePath}`;

      // Check if test script exists
      try {
        await execAsync(`cd ${modulePath} && npm run test --dry-run`, { timeout: 5000 });
      } catch (checkError) {
        // No test script available
        logger.warn(`testModule: No test script available for module: ${moduleId}`);

        await moduleService.updateModuleState(moduleId, {
          testStatus: 'not_configured',
          lastTestRun: new Date().toISOString()
        });

        res.status(422).json({
          success: false,
          error: 'Test not configured',
          message: `Module '${moduleId}' does not have a test script configured`,
          timestamp: new Date().toISOString(),
          moduleId
        });
        return;
      }

      // Build test command
      if (coverage) {
        testCommand += ' && npm run test:coverage';
      } else {
        testCommand += ' && npm run test';
      }

      if (testFiles) {
        testCommand += ` -- ${testFiles}`;
      }

      if (!watch) {
        testCommand += ' --watchAll=false';
      }

      logger.info(`testModule: Executing test command: ${testCommand}`);

      // Execute tests with timeout
      const { stdout, stderr } = await execAsync(testCommand, {
        timeout: 600000, // 10 minutes timeout for tests
        maxBuffer: 1024 * 1024 * 20 // 20MB buffer
      });

      testOutput = stdout + '\n' + stderr;
      testSuccess = true;

      // Parse test output for results
      const testSummaryMatch = testOutput.match(/Tests:\s+(\d+)\s+passed,\s+(\d+)\s+failed/);
      if (testSummaryMatch) {
        passedTests = parseInt(testSummaryMatch[1], 10);
        failedTests = parseInt(testSummaryMatch[2], 10);
        totalTests = passedTests + failedTests;
        testSuccess = failedTests === 0;
      }

      // Parse coverage if available
      const coverageMatch = testOutput.match(/All files[^\n]*?(\d+(?:\.\d+)?)\%/);
      if (coverageMatch) {
        coveragePercent = parseFloat(coverageMatch[1]);
      }

      logger.info(`testModule: Test execution completed for module: ${moduleId}`, {
        testSuccess,
        passedTests,
        failedTests,
        totalTests,
        coveragePercent
      });

    } catch (testError) {
      testSuccess = false;
      testOutput = testError instanceof Error ? testError.message : 'Unknown test error';
      failedTests = 1;

      logger.error(`testModule: Test execution failed for module: ${moduleId}`, {
        error: testError,
        testOutput: testOutput.substring(0, 1000)
      });
    }

    // Update module state with test results
    const updatedState = await moduleService.updateModuleState(moduleId, {
      testStatus: testSuccess ? 'passing' : 'failing',
      lastTestRun: new Date().toISOString(),
      healthScore: testSuccess
        ? Math.min(90 + (coveragePercent > 80 ? 10 : 0), 100)
        : Math.max(currentState.healthScore - 20, 10)
    });

    // Update test metrics
    await orchestrationService.updateTestMetrics(moduleId, {
      testTime: new Date().toISOString(),
      duration: 0, // Could be calculated if needed
      success: testSuccess,
      passed: passedTests,
      failed: failedTests,
      total: totalTests,
      coverage: {
        lines: coveragePercent,
        functions: coveragePercent, // Simplified
        branches: coveragePercent,  // Simplified
        statements: coveragePercent // Simplified
      }
    });

    testResult = {
      success: testSuccess,
      passed: passedTests,
      failed: failedTests,
      total: totalTests,
      coverage: coveragePercent,
      duration: 0, // Placeholder
      output: testOutput.substring(0, 5000), // Truncate for response
      timestamp: new Date().toISOString()
    };

    res.status(testSuccess ? 200 : 422).json({
      success: testSuccess,
      data: {
        moduleState: updatedState,
        testResult
      },
      timestamp: new Date().toISOString(),
      moduleId
    });

  } catch (error) {
    logger.error(`testModule: Error in test process`, {
      error,
      moduleId: req.params.moduleId
    });

    // Update module state to reflect test error
    try {
      const moduleService = new ModuleRecoveryService();
      await moduleService.updateModuleState(req.params.moduleId || 'unknown', {
        testStatus: 'failing',
        lastTestRun: new Date().toISOString()
      });
    } catch (updateError) {
      logger.error('testModule: Failed to update module state after error', { updateError });
    }

    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});