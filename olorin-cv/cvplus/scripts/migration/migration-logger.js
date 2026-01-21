/**
 * CVPlus Migration Logger
 * 
 * Comprehensive logging system for tracking all migration operations
 * Author: Gil Klainert
 * Date: 2025-08-28
 * 
 * Features:
 * - Structured logging with multiple severity levels
 * - Rotation and archival of log files
 * - Real-time log streaming
 * - Integration with migration tracking system
 * - Error reporting and alerting
 */

const fs = require('fs').promises;
const path = require('path');
const { EventEmitter } = require('events');

class MigrationLogger extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.rootPath = '/Users/gklainert/Documents/cvplus';
    this.logsPath = path.join(this.rootPath, 'scripts/migration/logs');
    
    // Configuration
    this.config = {
      maxFileSize: options.maxFileSize || 50 * 1024 * 1024, // 50MB
      maxFiles: options.maxFiles || 10,
      rotateDaily: options.rotateDaily !== false,
      enableConsole: options.enableConsole !== false,
      enableFile: options.enableFile !== false,
      enableRealTime: options.enableRealTime !== false,
      logLevel: options.logLevel || 'info',
      dateFormat: 'YYYY-MM-DD HH:mm:ss',
      ...options
    };
    
    // Log levels
    this.LOG_LEVELS = {
      trace: 0,
      debug: 1,
      info: 2,
      warn: 3,
      error: 4,
      fatal: 5
    };
    
    // Current log files
    this.currentLogFiles = {
      main: null,
      error: null,
      migration: null
    };
    
    // Log streams
    this.streams = new Map();
    
    // Initialize
    this.initialize();
  }

  /**
   * Initialize the logger
   */
  async initialize() {
    try {
      // Ensure logs directory exists
      await this.ensureLogsDirectory();
      
      // Initialize log files
      await this.initializeLogFiles();
      
      // Setup rotation timers
      if (this.config.rotateDaily) {
        this.setupDailyRotation();
      }
      
      // Setup real-time streaming
      if (this.config.enableRealTime) {
        this.setupRealTimeStreaming();
      }
      
      this.info('MigrationLogger initialized successfully');
    } catch (error) {
      console.error('Failed to initialize MigrationLogger:', error);
      throw error;
    }
  }

  /**
   * Ensure logs directory structure exists
   */
  async ensureLogsDirectory() {
    const dirs = [
      this.logsPath,
      path.join(this.logsPath, 'archive'),
      path.join(this.logsPath, 'migration'),
      path.join(this.logsPath, 'errors'),
      path.join(this.logsPath, 'debug')
    ];
    
    for (const dir of dirs) {
      try {
        await fs.access(dir);
      } catch {
        await fs.mkdir(dir, { recursive: true });
      }
    }
  }

  /**
   * Initialize log file streams
   */
  async initializeLogFiles() {
    const timestamp = this.getDateString();
    
    this.currentLogFiles = {
      main: path.join(this.logsPath, `migration-${timestamp}.log`),
      error: path.join(this.logsPath, 'errors', `errors-${timestamp}.log`),
      migration: path.join(this.logsPath, 'migration', `migration-ops-${timestamp}.log`),
      debug: path.join(this.logsPath, 'debug', `debug-${timestamp}.log`)
    };
    
    // Create initial log entries
    await this.writeToFile('main', this.formatLogEntry('info', 'SYSTEM', 'Migration Logger initialized'));
    await this.writeToFile('migration', this.formatLogEntry('info', 'MIGRATION', 'Migration operations log started'));
  }

  /**
   * Setup daily log rotation
   */
  setupDailyRotation() {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const msUntilMidnight = tomorrow.getTime() - now.getTime();
    
    setTimeout(() => {
      this.rotateLogs();
      
      // Setup daily rotation
      setInterval(() => {
        this.rotateLogs();
      }, 24 * 60 * 60 * 1000); // Every 24 hours
    }, msUntilMidnight);
  }

  /**
   * Setup real-time log streaming
   */
  setupRealTimeStreaming() {
    // WebSocket or EventSource implementation would go here
    // For now, emit events for real-time updates
    this.on('log', (entry) => {
      if (this.config.enableRealTime) {
        // Emit to any connected real-time clients
        this.emit('realtime-log', entry);
      }
    });
  }

  /**
   * Get current date string for filenames
   */
  getDateString(date = new Date()) {
    return date.toISOString().split('T')[0];
  }

  /**
   * Get current timestamp string
   */
  getTimestamp(date = new Date()) {
    return date.toISOString().replace('T', ' ').substring(0, 19);
  }

  /**
   * Check if log level should be output
   */
  shouldLog(level) {
    const currentLevel = this.LOG_LEVELS[this.config.logLevel];
    const messageLevel = this.LOG_LEVELS[level];
    return messageLevel >= currentLevel;
  }

  /**
   * Format log entry
   */
  formatLogEntry(level, category, message, metadata = {}) {
    const timestamp = this.getTimestamp();
    const levelStr = level.toUpperCase().padEnd(5);
    const categoryStr = category.padEnd(12);
    
    let formattedMessage = `[${timestamp}] [${levelStr}] [${categoryStr}] ${message}`;
    
    if (metadata && Object.keys(metadata).length > 0) {
      formattedMessage += ` | ${JSON.stringify(metadata)}`;
    }
    
    return formattedMessage;
  }

  /**
   * Write to log file
   */
  async writeToFile(fileType, content) {
    if (!this.config.enableFile) return;
    
    const filePath = this.currentLogFiles[fileType];
    if (!filePath) return;
    
    try {
      await fs.appendFile(filePath, content + '\n');
      
      // Check file size for rotation
      await this.checkFileSize(fileType);
    } catch (error) {
      console.error(`Failed to write to ${fileType} log:`, error);
    }
  }

  /**
   * Check if file needs rotation due to size
   */
  async checkFileSize(fileType) {
    const filePath = this.currentLogFiles[fileType];
    if (!filePath) return;
    
    try {
      const stats = await fs.stat(filePath);
      if (stats.size > this.config.maxFileSize) {
        await this.rotateFile(fileType);
      }
    } catch (error) {
      // File might not exist yet, ignore
    }
  }

  /**
   * Rotate a specific log file
   */
  async rotateFile(fileType) {
    const currentFile = this.currentLogFiles[fileType];
    if (!currentFile) return;
    
    try {
      const timestamp = Date.now();
      const archivePath = path.join(
        this.logsPath, 
        'archive', 
        `${path.basename(currentFile, '.log')}-${timestamp}.log`
      );
      
      // Move current file to archive
      await fs.rename(currentFile, archivePath);
      
      // Create new log file
      await this.writeToFile(fileType, this.formatLogEntry('info', 'SYSTEM', `Log rotated: ${fileType}`));
      
      this.info(`Log file rotated: ${fileType} -> ${path.basename(archivePath)}`);
      
      // Clean up old archives
      await this.cleanupOldLogs();
    } catch (error) {
      console.error(`Failed to rotate log file ${fileType}:`, error);
    }
  }

  /**
   * Rotate all log files
   */
  async rotateLogs() {
    this.info('Starting daily log rotation');
    
    for (const fileType of Object.keys(this.currentLogFiles)) {
      await this.rotateFile(fileType);
    }
    
    // Reinitialize log files with new date
    await this.initializeLogFiles();
    
    this.info('Daily log rotation completed');
  }

  /**
   * Clean up old log files
   */
  async cleanupOldLogs() {
    try {
      const archiveDir = path.join(this.logsPath, 'archive');
      const files = await fs.readdir(archiveDir);
      
      // Sort files by modification time (oldest first)
      const filesWithStats = await Promise.all(
        files.map(async (file) => {
          const filePath = path.join(archiveDir, file);
          const stats = await fs.stat(filePath);
          return { file, path: filePath, mtime: stats.mtime };
        })
      );
      
      filesWithStats.sort((a, b) => a.mtime - b.mtime);
      
      // Remove excess files
      if (filesWithStats.length > this.config.maxFiles) {
        const filesToDelete = filesWithStats.slice(0, filesWithStats.length - this.config.maxFiles);
        
        for (const { path: filePath, file } of filesToDelete) {
          await fs.unlink(filePath);
          this.debug(`Cleaned up old log file: ${file}`);
        }
      }
    } catch (error) {
      console.error('Failed to cleanup old logs:', error);
    }
  }

  /**
   * Log methods for different levels
   */
  trace(message, metadata = {}) {
    this.log('trace', 'TRACE', message, metadata);
  }

  debug(message, metadata = {}) {
    this.log('debug', 'DEBUG', message, metadata);
  }

  info(message, metadata = {}) {
    this.log('info', 'INFO', message, metadata);
  }

  warn(message, metadata = {}) {
    this.log('warn', 'WARN', message, metadata);
  }

  error(message, metadata = {}) {
    this.log('error', 'ERROR', message, metadata);
  }

  fatal(message, metadata = {}) {
    this.log('fatal', 'FATAL', message, metadata);
  }

  /**
   * Core logging method
   */
  log(level, category, message, metadata = {}) {
    if (!this.shouldLog(level)) return;
    
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: level,
      category: category,
      message: message,
      metadata: metadata
    };
    
    const formattedEntry = this.formatLogEntry(level, category, message, metadata);
    
    // Console output
    if (this.config.enableConsole) {
      this.outputToConsole(level, formattedEntry);
    }
    
    // File output
    this.writeToFile('main', formattedEntry);
    
    // Error file output
    if (level === 'error' || level === 'fatal') {
      this.writeToFile('error', formattedEntry);
    }
    
    // Debug file output
    if (level === 'debug' || level === 'trace') {
      this.writeToFile('debug', formattedEntry);
    }
    
    // Emit event
    this.emit('log', logEntry);
  }

  /**
   * Output to console with color coding
   */
  outputToConsole(level, formattedEntry) {
    const colors = {
      trace: '\x1b[90m', // Gray
      debug: '\x1b[36m', // Cyan
      info: '\x1b[32m',  // Green
      warn: '\x1b[33m',  // Yellow
      error: '\x1b[31m', // Red
      fatal: '\x1b[35m'  // Magenta
    };
    
    const reset = '\x1b[0m';
    const color = colors[level] || '';
    
    console.log(color + formattedEntry + reset);
  }

  /**
   * Migration-specific logging methods
   */
  migration(operation, functionName, status, metadata = {}) {
    const message = `${operation}: ${functionName} -> ${status}`;
    const enhancedMetadata = {
      operation,
      functionName,
      status,
      ...metadata
    };
    
    this.log('info', 'MIGRATION', message, enhancedMetadata);
    this.writeToFile('migration', this.formatLogEntry('info', 'MIGRATION', message, enhancedMetadata));
  }

  /**
   * Function inventory logging
   */
  inventory(action, functionName, details = {}) {
    const message = `${action}: ${functionName}`;
    const metadata = {
      action,
      functionName,
      ...details
    };
    
    this.log('info', 'INVENTORY', message, metadata);
  }

  /**
   * Dependency tracking logging
   */
  dependency(type, sourceFunction, targetFunction, details = {}) {
    const message = `${type}: ${sourceFunction} -> ${targetFunction}`;
    const metadata = {
      type,
      sourceFunction,
      targetFunction,
      ...details
    };
    
    this.log('info', 'DEPENDENCY', message, metadata);
  }

  /**
   * Risk assessment logging
   */
  risk(functionName, riskLevel, factors = []) {
    const message = `Risk assessment: ${functionName} = ${riskLevel}`;
    const metadata = {
      functionName,
      riskLevel,
      factors
    };
    
    this.log('warn', 'RISK', message, metadata);
  }

  /**
   * Verification logging
   */
  verification(functionName, testType, result, details = {}) {
    const message = `Verification: ${functionName} ${testType} = ${result}`;
    const metadata = {
      functionName,
      testType,
      result,
      ...details
    };
    
    const level = result === 'PASS' ? 'info' : 'error';
    this.log(level, 'VERIFY', message, metadata);
  }

  /**
   * Rollback logging
   */
  rollback(functionName, reason, steps = []) {
    const message = `Rollback initiated: ${functionName} - ${reason}`;
    const metadata = {
      functionName,
      reason,
      steps
    };
    
    this.log('warn', 'ROLLBACK', message, metadata);
  }

  /**
   * Performance logging
   */
  performance(operation, duration, details = {}) {
    const message = `Performance: ${operation} took ${duration}ms`;
    const metadata = {
      operation,
      duration,
      ...details
    };
    
    this.log('info', 'PERF', message, metadata);
  }

  /**
   * Get recent log entries
   */
  async getRecentLogs(fileType = 'main', lines = 100) {
    const filePath = this.currentLogFiles[fileType];
    if (!filePath) return [];
    
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const allLines = content.split('\n').filter(line => line.trim());
      return allLines.slice(-lines);
    } catch (error) {
      console.error(`Failed to read log file ${fileType}:`, error);
      return [];
    }
  }

  /**
   * Search log entries
   */
  async searchLogs(pattern, fileType = 'main') {
    const filePath = this.currentLogFiles[fileType];
    if (!filePath) return [];
    
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const allLines = content.split('\n');
      
      const regex = new RegExp(pattern, 'i');
      return allLines.filter(line => regex.test(line));
    } catch (error) {
      console.error(`Failed to search log file ${fileType}:`, error);
      return [];
    }
  }

  /**
   * Get log statistics
   */
  async getLogStatistics() {
    const stats = {
      files: {},
      totalEntries: 0,
      entriesByLevel: {},
      entriesByCategory: {},
      oldestEntry: null,
      newestEntry: null
    };
    
    for (const [fileType, filePath] of Object.entries(this.currentLogFiles)) {
      if (!filePath) continue;
      
      try {
        const fileStats = await fs.stat(filePath);
        const content = await fs.readFile(filePath, 'utf8');
        const lines = content.split('\n').filter(line => line.trim());
        
        stats.files[fileType] = {
          path: filePath,
          size: fileStats.size,
          entries: lines.length,
          lastModified: fileStats.mtime
        };
        
        stats.totalEntries += lines.length;
        
        // Parse entries for statistics
        for (const line of lines) {
          const levelMatch = line.match(/\[(\w+)\]/);
          const categoryMatch = line.match(/\]\s*\[(\w+)\]/);
          
          if (levelMatch) {
            const level = levelMatch[1].toLowerCase();
            stats.entriesByLevel[level] = (stats.entriesByLevel[level] || 0) + 1;
          }
          
          if (categoryMatch) {
            const category = categoryMatch[1];
            stats.entriesByCategory[category] = (stats.entriesByCategory[category] || 0) + 1;
          }
        }
      } catch (error) {
        console.error(`Failed to get stats for ${fileType}:`, error);
      }
    }
    
    return stats;
  }

  /**
   * Export logs to JSON format
   */
  async exportLogs(fileType = 'main', format = 'json') {
    const filePath = this.currentLogFiles[fileType];
    if (!filePath) return null;
    
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const lines = content.split('\n').filter(line => line.trim());
      
      if (format === 'json') {
        const entries = lines.map(line => {
          const timestampMatch = line.match(/\[([\d\-\s:]+)\]/);
          const levelMatch = line.match(/\]\s*\[(\w+)\]/);
          const categoryMatch = line.match(/\]\s*\[(\w+)\]\s*\[(\w+)\]/);
          const messageMatch = line.match(/\]\s*([^|]+)/);
          const metadataMatch = line.match(/\|\s*({.+})$/);
          
          return {
            timestamp: timestampMatch ? timestampMatch[1] : null,
            level: levelMatch ? levelMatch[1].toLowerCase() : 'unknown',
            category: categoryMatch ? categoryMatch[2] : 'unknown',
            message: messageMatch ? messageMatch[1].trim() : line,
            metadata: metadataMatch ? JSON.parse(metadataMatch[1]) : {}
          };
        });
        
        return JSON.stringify(entries, null, 2);
      }
      
      return content;
    } catch (error) {
      console.error(`Failed to export logs for ${fileType}:`, error);
      return null;
    }
  }

  /**
   * Close logger and cleanup resources
   */
  async close() {
    this.info('Migration Logger shutting down');
    
    // Close any open streams
    for (const [name, stream] of this.streams) {
      try {
        if (stream.close) {
          stream.close();
        }
      } catch (error) {
        console.error(`Failed to close stream ${name}:`, error);
      }
    }
    
    // Remove all listeners
    this.removeAllListeners();
    
    console.log('Migration Logger closed');
  }
}

module.exports = MigrationLogger;

// CLI support
if (require.main === module) {
  const logger = new MigrationLogger();
  
  const command = process.argv[2];
  
  switch (command) {
    case 'test':
      logger.info('Testing logger functionality');
      logger.debug('Debug message with metadata', { test: true, value: 123 });
      logger.warn('Warning message');
      logger.error('Error message');
      logger.migration('START', 'testFunction', 'ANALYZING', { submodule: 'core' });
      logger.inventory('DISCOVERED', 'newFunction', { size: 1024, riskLevel: 'low' });
      logger.dependency('CROSS_MODULE', 'funcA', 'funcB', { sourceModule: 'auth', targetModule: 'core' });
      logger.risk('riskyFunction', 'high', ['admin access', 'delete operations']);
      logger.verification('migratedFunction', 'UNIT_TEST', 'PASS', { testsRun: 15 });
      logger.performance('migration', 5432, { function: 'testFunction' });
      
      setTimeout(() => {
        logger.close();
      }, 1000);
      break;
      
    case 'stats':
      logger.getLogStatistics().then(stats => {
        console.log('\n📊 LOG STATISTICS\n');
        console.log(JSON.stringify(stats, null, 2));
      }).catch(error => {
        console.error('Failed to get stats:', error);
      });
      break;
      
    case 'tail':
      const lines = parseInt(process.argv[3]) || 50;
      logger.getRecentLogs('main', lines).then(logs => {
        console.log(`\n📝 RECENT LOG ENTRIES (last ${lines})\n`);
        logs.forEach(log => console.log(log));
      }).catch(error => {
        console.error('Failed to tail logs:', error);
      });
      break;
      
    case 'search':
      const pattern = process.argv[3];
      if (!pattern) {
        console.error('Please provide a search pattern');
        process.exit(1);
      }
      
      logger.searchLogs(pattern).then(results => {
        console.log(`\n🔍 SEARCH RESULTS for "${pattern}"\n`);
        results.forEach(result => console.log(result));
        console.log(`\nFound ${results.length} matching entries`);
      }).catch(error => {
        console.error('Failed to search logs:', error);
      });
      break;
      
    case 'export':
      const fileType = process.argv[3] || 'main';
      const format = process.argv[4] || 'json';
      
      logger.exportLogs(fileType, format).then(exported => {
        if (exported) {
          console.log(exported);
        } else {
          console.error('Failed to export logs');
        }
      }).catch(error => {
        console.error('Export failed:', error);
      });
      break;
      
    default:
      console.log(`
CVPlus Migration Logger

Usage:
  node migration-logger.js test              - Test logger functionality
  node migration-logger.js stats             - Show log statistics
  node migration-logger.js tail [lines]      - Show recent log entries
  node migration-logger.js search <pattern>  - Search log entries
  node migration-logger.js export [type] [format] - Export logs

Examples:
  node migration-logger.js test
  node migration-logger.js tail 100
  node migration-logger.js search "ERROR"
  node migration-logger.js export main json
      `);
  }
}