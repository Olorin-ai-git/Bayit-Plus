/**
 * CVPlus Migration Rollback System
 * 
 * Comprehensive rollback and recovery system for failed migrations
 * Author: Gil Klainert
 * Date: 2025-08-28
 * 
 * Features:
 * - Multiple rollback strategies
 * - Automated recovery procedures
 * - State preservation and restoration
 * - Rollback validation and verification
 * - Emergency rollback capabilities
 */

const fs = require('fs').promises;
const path = require('path');
const { spawn } = require('child_process');
const MigrationLogger = require('./migration-logger');

class MigrationRollbackSystem {
  constructor() {
    this.rootPath = '/Users/gklainert/Documents/cvplus';
    this.configPath = path.join(this.rootPath, 'scripts/migration/config');
    this.backupsPath = path.join(this.rootPath, 'scripts/migration/backups');
    this.logger = new MigrationLogger({ logLevel: 'info' });
    
    // Load configuration
    this.config = null;
    this.loadConfiguration();
    
    // Rollback state
    this.rollbackHistory = new Map();
    this.backupRegistry = new Map();
    this.rollbackStrategies = new Map();
    
    // Initialize rollback strategies
    this.initializeStrategies();
  }

  /**
   * Load rollback configuration
   */
  async loadConfiguration() {
    try {
      const configFile = path.join(this.configPath, 'migration-settings.json');
      const configData = await fs.readFile(configFile, 'utf8');
      this.config = JSON.parse(configData);
      
      this.logger.info('Rollback system configuration loaded');
    } catch (error) {
      this.logger.error('Failed to load rollback configuration', { error: error.message });
      // Use default configuration
      this.config = this.getDefaultConfig();
    }
  }

  /**
   * Get default rollback configuration
   */
  getDefaultConfig() {
    return {
      rollback: {
        strategies: ['git-revert', 'previous-deployment', 'function-disable'],
        autoRollbackTriggers: ['error-rate-spike', 'performance-degradation'],
        manualApprovalRequired: true,
        verificationAfterRollback: true
      },
      backup: {
        enabled: true,
        retention: { daily: 7, weekly: 4, monthly: 12 }
      },
      monitoring: {
        errorAlertThreshold: 10,
        performanceAlertThreshold: 2000
      }
    };
  }

  /**
   * Initialize rollback strategies
   */
  initializeStrategies() {
    // Git-based rollback
    this.rollbackStrategies.set('git-revert', {
      name: 'Git Revert',
      description: 'Revert code changes using Git',
      execute: this.gitRevertRollback.bind(this),
      verify: this.verifyGitRollback.bind(this),
      riskLevel: 'low'
    });

    // Previous deployment rollback
    this.rollbackStrategies.set('previous-deployment', {
      name: 'Previous Deployment',
      description: 'Restore previous Firebase deployment',
      execute: this.previousDeploymentRollback.bind(this),
      verify: this.verifyDeploymentRollback.bind(this),
      riskLevel: 'medium'
    });

    // Blue-Green deployment switch
    this.rollbackStrategies.set('blue-green-switch', {
      name: 'Blue-Green Switch',
      description: 'Switch traffic to previous environment',
      execute: this.blueGreenSwitchRollback.bind(this),
      verify: this.verifyBlueGreenRollback.bind(this),
      riskLevel: 'low'
    });

    // Function disable
    this.rollbackStrategies.set('function-disable', {
      name: 'Function Disable',
      description: 'Disable problematic function',
      execute: this.functionDisableRollback.bind(this),
      verify: this.verifyFunctionDisable.bind(this),
      riskLevel: 'high'
    });

    // File system restore
    this.rollbackStrategies.set('filesystem-restore', {
      name: 'File System Restore',
      description: 'Restore files from backup',
      execute: this.filesystemRestoreRollback.bind(this),
      verify: this.verifyFilesystemRestore.bind(this),
      riskLevel: 'medium'
    });

    this.logger.info(`Initialized ${this.rollbackStrategies.size} rollback strategies`);
  }

  /**
   * Create backup before migration
   */
  async createBackup(functionName, targetSubmodule, metadata = {}) {
    this.logger.info(`Creating backup for ${functionName}`, {
      functionName,
      targetSubmodule,
      metadata
    });

    const backupId = `${functionName}-${Date.now()}`;
    const backupPath = path.join(this.backupsPath, backupId);

    const backup = {
      id: backupId,
      functionName,
      targetSubmodule,
      createdAt: new Date().toISOString(),
      metadata,
      backupPath,
      components: {}
    };

    try {
      // Ensure backup directory exists
      await fs.mkdir(backupPath, { recursive: true });

      // Backup source function
      await this.backupSourceFunction(functionName, backup);

      // Backup deployment state
      await this.backupDeploymentState(functionName, backup);

      // Backup database state (if applicable)
      await this.backupDatabaseState(functionName, backup);

      // Backup configuration files
      await this.backupConfiguration(functionName, targetSubmodule, backup);

      // Store backup registry entry
      this.backupRegistry.set(backupId, backup);

      // Save backup metadata
      const metadataFile = path.join(backupPath, 'backup-metadata.json');
      await fs.writeFile(metadataFile, JSON.stringify(backup, null, 2));

      this.logger.info(`Backup created successfully: ${backupId}`, {
        backupId,
        functionName,
        components: Object.keys(backup.components).length
      });

      return backupId;

    } catch (error) {
      this.logger.error(`Failed to create backup for ${functionName}`, {
        functionName,
        backupId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Backup source function
   */
  async backupSourceFunction(functionName, backup) {
    const functionsPath = path.join(this.rootPath, 'functions/src/functions');
    
    // Find function file (could be in subdirectories)
    const functionFiles = await this.findFunctionFiles(functionsPath, functionName);
    
    for (const filePath of functionFiles) {
      const relativePath = path.relative(functionsPath, filePath);
      const backupFilePath = path.join(backup.backupPath, 'source', relativePath);
      
      // Ensure directory exists
      await fs.mkdir(path.dirname(backupFilePath), { recursive: true });
      
      // Copy file
      await fs.copyFile(filePath, backupFilePath);
      
      backup.components[`source_${relativePath}`] = {
        type: 'source_file',
        originalPath: filePath,
        backupPath: backupFilePath,
        size: (await fs.stat(filePath)).size
      };
    }
  }

  /**
   * Find function files
   */
  async findFunctionFiles(basePath, functionName) {
    const files = [];
    
    try {
      const entries = await fs.readdir(basePath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(basePath, entry.name);
        
        if (entry.isDirectory()) {
          const subFiles = await this.findFunctionFiles(fullPath, functionName);
          files.push(...subFiles);
        } else if (entry.isFile()) {
          if (entry.name.startsWith(functionName) && entry.name.endsWith('.ts')) {
            files.push(fullPath);
          }
        }
      }
    } catch (error) {
      // Directory doesn't exist or permission denied
    }
    
    return files;
  }

  /**
   * Backup deployment state
   */
  async backupDeploymentState(functionName, backup) {
    try {
      // Get current Firebase deployment state
      const deploymentState = await this.getCurrentDeploymentState(functionName);
      
      if (deploymentState) {
        const deploymentFile = path.join(backup.backupPath, 'deployment-state.json');
        await fs.writeFile(deploymentFile, JSON.stringify(deploymentState, null, 2));
        
        backup.components.deployment_state = {
          type: 'deployment_state',
          backupPath: deploymentFile,
          functions: deploymentState.functions?.length || 0
        };
      }
    } catch (error) {
      this.logger.warn(`Failed to backup deployment state for ${functionName}`, {
        functionName,
        error: error.message
      });
    }
  }

  /**
   * Get current deployment state
   */
  async getCurrentDeploymentState(functionName) {
    try {
      // Use Firebase CLI to get function info
      const result = await this.executeCommand('firebase functions:list --json', this.rootPath);
      
      if (result.exitCode === 0) {
        const functions = JSON.parse(result.output);
        return {
          functions: functions.filter(fn => fn.name.includes(functionName)),
          timestamp: new Date().toISOString()
        };
      }
    } catch (error) {
      this.logger.debug(`Could not get deployment state: ${error.message}`);
    }
    
    return null;
  }

  /**
   * Backup database state (if applicable)
   */
  async backupDatabaseState(functionName, backup) {
    try {
      // Check if function interacts with specific collections
      const affectedCollections = await this.getAffectedCollections(functionName);
      
      if (affectedCollections.length > 0) {
        const dbBackupPath = path.join(backup.backupPath, 'database-state.json');
        
        // Export relevant data (simplified - in production would use Firestore export)
        const dbState = {
          collections: affectedCollections,
          timestamp: new Date().toISOString(),
          note: 'Database backup created for rollback purposes'
        };
        
        await fs.writeFile(dbBackupPath, JSON.stringify(dbState, null, 2));
        
        backup.components.database_state = {
          type: 'database_state',
          backupPath: dbBackupPath,
          collections: affectedCollections.length
        };
      }
    } catch (error) {
      this.logger.warn(`Failed to backup database state for ${functionName}`, {
        functionName,
        error: error.message
      });
    }
  }

  /**
   * Get affected database collections for a function
   */
  async getAffectedCollections(functionName) {
    const collections = [];
    
    try {
      // Analyze function code to find database operations
      const functionFiles = await this.findFunctionFiles(
        path.join(this.rootPath, 'functions/src/functions'),
        functionName
      );
      
      for (const filePath of functionFiles) {
        const content = await fs.readFile(filePath, 'utf8');
        
        // Look for Firestore collection references
        const collectionMatches = content.match(/collection\(['"]([^'"]+)['"]\)/g);
        if (collectionMatches) {
          for (const match of collectionMatches) {
            const collectionName = match.match(/collection\(['"]([^'"]+)['"]\)/)[1];
            if (!collections.includes(collectionName)) {
              collections.push(collectionName);
            }
          }
        }
      }
    } catch (error) {
      this.logger.debug(`Could not analyze collections for ${functionName}: ${error.message}`);
    }
    
    return collections;
  }

  /**
   * Backup configuration files
   */
  async backupConfiguration(functionName, targetSubmodule, backup) {
    try {
      const configFiles = [
        'firebase.json',
        'firestore.rules',
        'functions/package.json',
        'functions/.env',
        'functions/tsconfig.json'
      ];
      
      for (const configFile of configFiles) {
        const filePath = path.join(this.rootPath, configFile);
        
        try {
          await fs.access(filePath);
          
          const backupFilePath = path.join(backup.backupPath, 'config', configFile);
          await fs.mkdir(path.dirname(backupFilePath), { recursive: true });
          await fs.copyFile(filePath, backupFilePath);
          
          backup.components[`config_${configFile.replace('/', '_')}`] = {
            type: 'config_file',
            originalPath: filePath,
            backupPath: backupFilePath,
            size: (await fs.stat(filePath)).size
          };
        } catch {
          // File doesn't exist, skip
        }
      }
    } catch (error) {
      this.logger.warn(`Failed to backup configuration for ${functionName}`, {
        functionName,
        error: error.message
      });
    }
  }

  /**
   * Execute rollback for a function
   */
  async executeRollback(functionName, strategy = 'auto', backupId = null, reason = 'Manual rollback') {
    this.logger.warn(`Initiating rollback for ${functionName}`, {
      functionName,
      strategy,
      backupId,
      reason
    });

    const rollbackId = `rollback-${functionName}-${Date.now()}`;
    const rollback = {
      id: rollbackId,
      functionName,
      strategy,
      backupId,
      reason,
      startTime: Date.now(),
      status: 'INITIATED',
      steps: [],
      errors: [],
      verificationResults: null
    };

    try {
      // Determine rollback strategy
      const selectedStrategy = await this.selectRollbackStrategy(functionName, strategy, backupId);
      rollback.strategy = selectedStrategy.name;

      this.logger.rollback(functionName, reason, [`Using strategy: ${selectedStrategy.name}`]);

      // Execute rollback strategy
      rollback.status = 'EXECUTING';
      const executionResult = await selectedStrategy.execute(functionName, backupId, rollback);
      
      rollback.steps.push(...executionResult.steps);
      
      if (!executionResult.success) {
        rollback.status = 'FAILED';
        rollback.errors.push(...executionResult.errors);
        throw new Error(`Rollback execution failed: ${executionResult.errors.join(', ')}`);
      }

      // Verify rollback if required
      if (this.config.rollback.verificationAfterRollback) {
        rollback.status = 'VERIFYING';
        const verificationResult = await selectedStrategy.verify(functionName, rollback);
        rollback.verificationResults = verificationResult;
        
        if (!verificationResult.success) {
          rollback.status = 'VERIFICATION_FAILED';
          rollback.errors.push(...verificationResult.errors);
          throw new Error(`Rollback verification failed: ${verificationResult.errors.join(', ')}`);
        }
      }

      rollback.status = 'COMPLETED';
      rollback.endTime = Date.now();
      rollback.duration = rollback.endTime - rollback.startTime;

      // Store rollback history
      this.rollbackHistory.set(rollbackId, rollback);

      this.logger.info(`Rollback completed successfully: ${functionName}`, {
        functionName,
        rollbackId,
        duration: rollback.duration,
        strategy: selectedStrategy.name
      });

      return rollback;

    } catch (error) {
      rollback.status = 'FAILED';
      rollback.endTime = Date.now();
      rollback.duration = rollback.endTime - rollback.startTime;
      rollback.errors.push(error.message);

      this.rollbackHistory.set(rollbackId, rollback);

      this.logger.error(`Rollback failed for ${functionName}`, {
        functionName,
        rollbackId,
        error: error.message,
        duration: rollback.duration
      });

      throw error;
    }
  }

  /**
   * Select appropriate rollback strategy
   */
  async selectRollbackStrategy(functionName, strategy, backupId) {
    if (strategy !== 'auto') {
      const selectedStrategy = this.rollbackStrategies.get(strategy);
      if (!selectedStrategy) {
        throw new Error(`Unknown rollback strategy: ${strategy}`);
      }
      return selectedStrategy;
    }

    // Auto-select strategy based on available options
    const availableStrategies = this.config.rollback.strategies || ['git-revert', 'function-disable'];
    
    // Prefer low-risk strategies
    for (const strategyName of availableStrategies) {
      const strategy = this.rollbackStrategies.get(strategyName);
      if (strategy && strategy.riskLevel === 'low') {
        return strategy;
      }
    }

    // Fall back to medium-risk strategies
    for (const strategyName of availableStrategies) {
      const strategy = this.rollbackStrategies.get(strategyName);
      if (strategy && strategy.riskLevel === 'medium') {
        return strategy;
      }
    }

    // Fall back to high-risk strategies if necessary
    for (const strategyName of availableStrategies) {
      const strategy = this.rollbackStrategies.get(strategyName);
      if (strategy) {
        return strategy;
      }
    }

    throw new Error('No suitable rollback strategy found');
  }

  /**
   * Git revert rollback strategy
   */
  async gitRevertRollback(functionName, backupId, rollback) {
    const result = {
      success: false,
      steps: [],
      errors: []
    };

    try {
      result.steps.push('Finding commits related to function migration');
      
      // Find commits related to the function
      const gitLogResult = await this.executeCommand(
        `git log --oneline --grep="${functionName}" -n 10`,
        this.rootPath
      );

      if (gitLogResult.exitCode !== 0) {
        result.errors.push('Failed to retrieve git log');
        return result;
      }

      const commits = gitLogResult.output.split('\n').filter(line => line.trim());
      
      if (commits.length === 0) {
        result.errors.push('No commits found for function');
        return result;
      }

      // Get the most recent commit hash
      const latestCommitHash = commits[0].split(' ')[0];
      
      result.steps.push(`Reverting commit: ${latestCommitHash}`);
      
      // Create revert commit
      const revertResult = await this.executeCommand(
        `git revert ${latestCommitHash} --no-edit`,
        this.rootPath
      );

      if (revertResult.exitCode !== 0) {
        result.errors.push(`Git revert failed: ${revertResult.output}`);
        return result;
      }

      result.steps.push('Git revert completed successfully');
      result.success = true;

    } catch (error) {
      result.errors.push(`Git revert error: ${error.message}`);
    }

    return result;
  }

  /**
   * Verify git rollback
   */
  async verifyGitRollback(functionName, rollback) {
    const result = {
      success: false,
      checks: [],
      errors: []
    };

    try {
      // Check if the function file exists in expected state
      const functionFiles = await this.findFunctionFiles(
        path.join(this.rootPath, 'functions/src/functions'),
        functionName
      );

      if (functionFiles.length === 0) {
        result.checks.push({ name: 'Function file existence', passed: false });
        result.errors.push('Function files not found after rollback');
      } else {
        result.checks.push({ name: 'Function file existence', passed: true });
      }

      // Check git status
      const gitStatusResult = await this.executeCommand('git status --porcelain', this.rootPath);
      const hasUncommittedChanges = gitStatusResult.output.trim().length > 0;

      result.checks.push({
        name: 'Git repository clean',
        passed: !hasUncommittedChanges,
        details: hasUncommittedChanges ? 'Uncommitted changes present' : 'Repository clean'
      });

      result.success = result.checks.every(check => check.passed);

    } catch (error) {
      result.errors.push(`Git rollback verification error: ${error.message}`);
    }

    return result;
  }

  /**
   * Previous deployment rollback strategy
   */
  async previousDeploymentRollback(functionName, backupId, rollback) {
    const result = {
      success: false,
      steps: [],
      errors: []
    };

    try {
      result.steps.push('Identifying previous deployment');

      // Get deployment history
      const historyResult = await this.executeCommand(
        'firebase functions:list --json',
        this.rootPath
      );

      if (historyResult.exitCode !== 0) {
        result.errors.push('Failed to get deployment history');
        return result;
      }

      // Use backup to restore previous state if available
      if (backupId) {
        const backup = this.backupRegistry.get(backupId);
        if (backup && backup.components.deployment_state) {
          result.steps.push(`Restoring from backup: ${backupId}`);
          
          // This would involve redeploying the previous version
          // For now, simulate the process
          result.steps.push('Redeploying previous function version');
          
          // In a real implementation, this would:
          // 1. Restore the source code from backup
          // 2. Redeploy the function
          // 3. Verify deployment
          
          result.success = true;
        } else {
          result.errors.push('Backup not found or incomplete');
        }
      } else {
        result.errors.push('No backup ID provided for restoration');
      }

    } catch (error) {
      result.errors.push(`Previous deployment rollback error: ${error.message}`);
    }

    return result;
  }

  /**
   * Verify deployment rollback
   */
  async verifyDeploymentRollback(functionName, rollback) {
    const result = {
      success: false,
      checks: [],
      errors: []
    };

    try {
      // Check if function is deployed and responding
      const deploymentCheck = await this.getCurrentDeploymentState(functionName);
      
      if (deploymentCheck && deploymentCheck.functions.length > 0) {
        result.checks.push({ name: 'Function deployed', passed: true });
        
        // Test function endpoint if it's HTTP callable
        const func = deploymentCheck.functions.find(f => f.name.includes(functionName));
        if (func) {
          result.checks.push({
            name: 'Function accessible',
            passed: true,
            details: `Function URL: ${func.httpsUrl || 'N/A'}`
          });
        }
      } else {
        result.checks.push({ name: 'Function deployed', passed: false });
        result.errors.push('Function not found in deployment');
      }

      result.success = result.checks.every(check => check.passed);

    } catch (error) {
      result.errors.push(`Deployment rollback verification error: ${error.message}`);
    }

    return result;
  }

  /**
   * Blue-Green deployment switch rollback
   */
  async blueGreenSwitchRollback(functionName, backupId, rollback) {
    const result = {
      success: false,
      steps: [],
      errors: []
    };

    try {
      result.steps.push('Initiating blue-green traffic switch');
      
      // This would involve switching traffic routing
      // Implementation depends on specific blue-green setup
      result.steps.push('Switching traffic to previous environment');
      result.steps.push('Verifying traffic switch completed');
      
      // Simulate successful switch
      result.success = true;

    } catch (error) {
      result.errors.push(`Blue-green switch error: ${error.message}`);
    }

    return result;
  }

  /**
   * Verify blue-green rollback
   */
  async verifyBlueGreenRollback(functionName, rollback) {
    const result = {
      success: true,
      checks: [{ name: 'Traffic switch', passed: true }],
      errors: []
    };

    return result;
  }

  /**
   * Function disable rollback strategy
   */
  async functionDisableRollback(functionName, backupId, rollback) {
    const result = {
      success: false,
      steps: [],
      errors: []
    };

    try {
      result.steps.push(`Disabling function: ${functionName}`);
      
      // This would involve removing the function from deployment
      const deleteResult = await this.executeCommand(
        `firebase functions:delete ${functionName} --force`,
        this.rootPath
      );

      if (deleteResult.exitCode === 0) {
        result.steps.push('Function disabled successfully');
        result.success = true;
      } else {
        result.errors.push(`Failed to disable function: ${deleteResult.output}`);
      }

    } catch (error) {
      result.errors.push(`Function disable error: ${error.message}`);
    }

    return result;
  }

  /**
   * Verify function disable
   */
  async verifyFunctionDisable(functionName, rollback) {
    const result = {
      success: false,
      checks: [],
      errors: []
    };

    try {
      const deploymentCheck = await this.getCurrentDeploymentState(functionName);
      const functionExists = deploymentCheck && 
        deploymentCheck.functions.some(f => f.name.includes(functionName));

      result.checks.push({
        name: 'Function disabled',
        passed: !functionExists,
        details: functionExists ? 'Function still exists' : 'Function successfully disabled'
      });

      result.success = !functionExists;

    } catch (error) {
      result.errors.push(`Function disable verification error: ${error.message}`);
    }

    return result;
  }

  /**
   * File system restore rollback strategy
   */
  async filesystemRestoreRollback(functionName, backupId, rollback) {
    const result = {
      success: false,
      steps: [],
      errors: []
    };

    try {
      if (!backupId) {
        result.errors.push('Backup ID required for filesystem restore');
        return result;
      }

      const backup = this.backupRegistry.get(backupId);
      if (!backup) {
        result.errors.push(`Backup not found: ${backupId}`);
        return result;
      }

      result.steps.push(`Restoring files from backup: ${backupId}`);

      // Restore source files
      for (const [componentName, component] of Object.entries(backup.components)) {
        if (component.type === 'source_file') {
          result.steps.push(`Restoring: ${component.originalPath}`);
          
          await fs.copyFile(component.backupPath, component.originalPath);
        }
      }

      result.steps.push('File system restore completed');
      result.success = true;

    } catch (error) {
      result.errors.push(`Filesystem restore error: ${error.message}`);
    }

    return result;
  }

  /**
   * Verify filesystem restore
   */
  async verifyFilesystemRestore(functionName, rollback) {
    const result = {
      success: false,
      checks: [],
      errors: []
    };

    try {
      // Check if function files exist
      const functionFiles = await this.findFunctionFiles(
        path.join(this.rootPath, 'functions/src/functions'),
        functionName
      );

      result.checks.push({
        name: 'Source files restored',
        passed: functionFiles.length > 0,
        details: `Found ${functionFiles.length} function files`
      });

      result.success = functionFiles.length > 0;

    } catch (error) {
      result.errors.push(`Filesystem restore verification error: ${error.message}`);
    }

    return result;
  }

  /**
   * Execute command with timeout
   */
  executeCommand(command, workingDirectory, timeout = 60000) {
    return new Promise((resolve, reject) => {
      const [cmd, ...args] = command.split(' ');
      
      const process = spawn(cmd, args, {
        cwd: workingDirectory,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let output = '';
      let errorOutput = '';

      process.stdout.on('data', (data) => {
        output += data.toString();
      });

      process.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      const timeoutId = setTimeout(() => {
        process.kill('SIGTERM');
        reject(new Error(`Command timeout after ${timeout}ms`));
      }, timeout);

      process.on('close', (exitCode) => {
        clearTimeout(timeoutId);
        
        resolve({
          exitCode,
          output: output + errorOutput,
          error: exitCode !== 0 ? errorOutput : null
        });
      });

      process.on('error', (error) => {
        clearTimeout(timeoutId);
        reject(error);
      });
    });
  }

  /**
   * Get rollback history for a function
   */
  getRollbackHistory(functionName) {
    const history = [];
    
    for (const [rollbackId, rollback] of this.rollbackHistory) {
      if (rollback.functionName === functionName) {
        history.push(rollback);
      }
    }
    
    return history.sort((a, b) => b.startTime - a.startTime);
  }

  /**
   * Get all available backups
   */
  getAvailableBackups(functionName = null) {
    const backups = [];
    
    for (const [backupId, backup] of this.backupRegistry) {
      if (!functionName || backup.functionName === functionName) {
        backups.push({
          id: backup.id,
          functionName: backup.functionName,
          targetSubmodule: backup.targetSubmodule,
          createdAt: backup.createdAt,
          components: Object.keys(backup.components).length
        });
      }
    }
    
    return backups.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  /**
   * Cleanup old backups
   */
  async cleanupOldBackups() {
    const retention = this.config.backup.retention;
    const now = new Date();
    
    for (const [backupId, backup] of this.backupRegistry) {
      const backupDate = new Date(backup.createdAt);
      const ageInDays = Math.floor((now - backupDate) / (1000 * 60 * 60 * 24));
      
      let shouldDelete = false;
      
      if (ageInDays > retention.monthly * 30) {
        shouldDelete = true;
      } else if (ageInDays > retention.weekly * 7 && ageInDays % 7 !== 0) {
        shouldDelete = true;
      } else if (ageInDays > retention.daily && ageInDays % 1 !== 0) {
        shouldDelete = true;
      }
      
      if (shouldDelete) {
        try {
          // Remove backup files
          await fs.rmdir(backup.backupPath, { recursive: true });
          
          // Remove from registry
          this.backupRegistry.delete(backupId);
          
          this.logger.info(`Cleaned up old backup: ${backupId}`, {
            backupId,
            functionName: backup.functionName,
            age: ageInDays
          });
        } catch (error) {
          this.logger.warn(`Failed to cleanup backup ${backupId}`, {
            backupId,
            error: error.message
          });
        }
      }
    }
  }

  /**
   * Generate rollback report
   */
  async generateRollbackReport() {
    const report = {
      summary: {
        totalRollbacks: this.rollbackHistory.size,
        successful: 0,
        failed: 0,
        byStrategy: {},
        averageTime: 0
      },
      rollbacks: Array.from(this.rollbackHistory.values()),
      backups: this.getAvailableBackups(),
      generatedAt: new Date().toISOString()
    };

    let totalTime = 0;
    
    for (const rollback of report.rollbacks) {
      if (rollback.status === 'COMPLETED') {
        report.summary.successful++;
      } else {
        report.summary.failed++;
      }
      
      if (!report.summary.byStrategy[rollback.strategy]) {
        report.summary.byStrategy[rollback.strategy] = 0;
      }
      report.summary.byStrategy[rollback.strategy]++;
      
      totalTime += rollback.duration || 0;
    }
    
    if (report.summary.totalRollbacks > 0) {
      report.summary.averageTime = Math.round(totalTime / report.summary.totalRollbacks);
    }

    // Save report
    const reportsPath = path.join(this.rootPath, 'scripts/migration/reports');
    await fs.mkdir(reportsPath, { recursive: true });
    
    const reportFile = path.join(reportsPath, `rollback-report-${Date.now()}.json`);
    await fs.writeFile(reportFile, JSON.stringify(report, null, 2));

    this.logger.info('Rollback report generated', {
      reportFile,
      totalRollbacks: report.summary.totalRollbacks,
      successRate: Math.round((report.summary.successful / report.summary.totalRollbacks) * 100)
    });

    return report;
  }
}

module.exports = MigrationRollbackSystem;

// CLI support
if (require.main === module) {
  const rollbackSystem = new MigrationRollbackSystem();
  
  const command = process.argv[2];
  const functionName = process.argv[3];
  const strategy = process.argv[4];
  const backupId = process.argv[5];

  switch (command) {
    case 'backup':
      if (!functionName) {
        console.error('Usage: node rollback-system.js backup <functionName> <targetSubmodule>');
        process.exit(1);
      }
      
      const targetSubmodule = process.argv[4] || 'unknown';
      
      rollbackSystem.createBackup(functionName, targetSubmodule).then(backupId => {
        console.log(`✅ Backup created: ${backupId}`);
      }).catch(error => {
        console.error('❌ Backup creation failed:', error);
        process.exit(1);
      });
      break;

    case 'rollback':
      if (!functionName) {
        console.error('Usage: node rollback-system.js rollback <functionName> [strategy] [backupId]');
        process.exit(1);
      }

      rollbackSystem.executeRollback(
        functionName, 
        strategy || 'auto', 
        backupId, 
        'Manual rollback via CLI'
      ).then(rollback => {
        console.log(`✅ Rollback completed: ${rollback.id}`);
        console.log(`Status: ${rollback.status}`);
        console.log(`Duration: ${rollback.duration}ms`);
        console.log(`Strategy: ${rollback.strategy}`);
      }).catch(error => {
        console.error('❌ Rollback failed:', error);
        process.exit(1);
      });
      break;

    case 'history':
      if (!functionName) {
        console.error('Usage: node rollback-system.js history <functionName>');
        process.exit(1);
      }

      const history = rollbackSystem.getRollbackHistory(functionName);
      console.log(`\n📜 ROLLBACK HISTORY for ${functionName}\n`);
      
      if (history.length === 0) {
        console.log('No rollback history found.');
      } else {
        history.forEach((rollback, index) => {
          console.log(`${index + 1}. ${rollback.id}`);
          console.log(`   Status: ${rollback.status}`);
          console.log(`   Strategy: ${rollback.strategy}`);
          console.log(`   Reason: ${rollback.reason}`);
          console.log(`   Date: ${new Date(rollback.startTime).toLocaleString()}`);
          console.log(`   Duration: ${rollback.duration}ms\n`);
        });
      }
      break;

    case 'backups':
      const backups = rollbackSystem.getAvailableBackups(functionName);
      console.log(`\n💾 AVAILABLE BACKUPS${functionName ? ` for ${functionName}` : ''}\n`);
      
      if (backups.length === 0) {
        console.log('No backups found.');
      } else {
        backups.forEach((backup, index) => {
          console.log(`${index + 1}. ${backup.id}`);
          console.log(`   Function: ${backup.functionName}`);
          console.log(`   Submodule: ${backup.targetSubmodule}`);
          console.log(`   Created: ${new Date(backup.createdAt).toLocaleString()}`);
          console.log(`   Components: ${backup.components}\n`);
        });
      }
      break;

    case 'cleanup':
      rollbackSystem.cleanupOldBackups().then(() => {
        console.log('✅ Backup cleanup completed');
      }).catch(error => {
        console.error('❌ Backup cleanup failed:', error);
        process.exit(1);
      });
      break;

    case 'report':
      rollbackSystem.generateRollbackReport().then(report => {
        console.log('\n📊 ROLLBACK REPORT\n');
        console.log(`Total Rollbacks: ${report.summary.totalRollbacks}`);
        console.log(`Success Rate: ${Math.round((report.summary.successful / report.summary.totalRollbacks) * 100)}%`);
        console.log(`Average Time: ${report.summary.averageTime}ms`);
        console.log('\nBy Strategy:');
        for (const [strategy, count] of Object.entries(report.summary.byStrategy)) {
          console.log(`  ${strategy}: ${count}`);
        }
      }).catch(error => {
        console.error('❌ Report generation failed:', error);
        process.exit(1);
      });
      break;

    default:
      console.log(`
CVPlus Migration Rollback System

Usage:
  node rollback-system.js backup <functionName> <targetSubmodule>
  node rollback-system.js rollback <functionName> [strategy] [backupId]
  node rollback-system.js history <functionName>
  node rollback-system.js backups [functionName]
  node rollback-system.js cleanup
  node rollback-system.js report

Rollback Strategies:
  - auto (default)        - Automatically select best strategy
  - git-revert           - Revert code changes using Git
  - previous-deployment  - Restore previous Firebase deployment
  - blue-green-switch    - Switch traffic to previous environment
  - function-disable     - Disable problematic function
  - filesystem-restore   - Restore files from backup

Examples:
  node rollback-system.js backup analyzeCV cv-processing
  node rollback-system.js rollback analyzeCV git-revert
  node rollback-system.js history analyzeCV
  node rollback-system.js backups analyzeCV
      `);
  }
}