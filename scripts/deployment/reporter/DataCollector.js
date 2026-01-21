/**
 * Deployment Data Collector
 */

const fs = require('fs').promises;
const path = require('path');

class DataCollector {
  constructor(projectRoot, logFile) {
    this.projectRoot = projectRoot;
    this.logFile = logFile;
  }

  async collectDeploymentData() {
    console.log('  📊 Collecting deployment data...');
    
    const deploymentData = {
      log: await this.parseDeploymentLog(),
      project: await this.getProjectInfo(),
      components: await this.getComponentInfo(),
      performance: await this.getPerformanceData()
    };
    
    console.log('    ✅ Deployment data collected');
    return deploymentData;
  }

  async parseDeploymentLog() {
    try {
      const logContent = await fs.readFile(this.logFile, 'utf8');
      const logLines = logContent.split('\n');
      
      const logData = {
        timestamp: new Date().toISOString(),
        events: [],
        errors: [],
        warnings: [],
        phases: {},
        duration: null
      };
      
      let startTime = null;
      let endTime = null;
      let currentPhase = null;
      
      for (const line of logLines) {
        if (!line.trim()) continue;
        
        const match = line.match(/^\[(.+?)\] \[(.+?)\] (.+)$/);
        if (!match) continue;
        
        const [, timestamp, level, message] = match;
        const logEntry = { timestamp, level, message };
        
        // Track timing
        if (message.includes('Starting intelligent Firebase deployment')) {
          startTime = new Date(timestamp);
        }
        if (message.includes('Deployment completed') || message.includes('Deployment failed')) {
          endTime = new Date(timestamp);
        }
        
        // Categorize entries
        if (level === 'ERROR') {
          logData.errors.push(logEntry);
        } else if (level === 'WARN') {
          logData.warnings.push(logEntry);
        } else {
          logData.events.push(logEntry);
        }
      }
      
      if (startTime && endTime) {
        logData.duration = endTime - startTime;
      }
      
      return logData;
    } catch (error) {
      console.error('Failed to parse deployment log:', error);
      return { events: [], errors: [], warnings: [], phases: {} };
    }
  }

  async getProjectInfo() {
    try {
      const packageJsonPath = path.join(this.projectRoot, 'package.json');
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
      
      return {
        name: packageJson.name || 'Unknown',
        version: packageJson.version || '0.0.0',
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        name: 'Unknown',
        version: '0.0.0',
        environment: 'unknown',
        timestamp: new Date().toISOString()
      };
    }
  }

  async getComponentInfo() {
    const components = {};
    
    try {
      // Check frontend
      const frontendPath = path.join(this.projectRoot, 'frontend');
      if (await this.pathExists(frontendPath)) {
        components.frontend = await this.analyzeComponent(frontendPath);
      }
      
      // Check functions
      const functionsPath = path.join(this.projectRoot, 'functions');
      if (await this.pathExists(functionsPath)) {
        components.functions = await this.analyzeComponent(functionsPath);
      }
      
    } catch (error) {
      console.error('Failed to analyze components:', error);
    }
    
    return components;
  }

  async analyzeComponent(componentPath) {
    try {
      const stats = await fs.stat(componentPath);
      const files = await this.countFiles(componentPath);
      
      return {
        path: componentPath,
        size: stats.size,
        files: files.total,
        jsFiles: files.js,
        tsFiles: files.ts,
        lastModified: stats.mtime
      };
    } catch (error) {
      return { path: componentPath, error: error.message };
    }
  }

  async countFiles(dirPath) {
    const counts = { total: 0, js: 0, ts: 0 };
    
    try {
      const files = await fs.readdir(dirPath, { recursive: true });
      
      for (const file of files) {
        if (file.endsWith('.js')) counts.js++;
        if (file.endsWith('.ts')) counts.ts++;
        counts.total++;
      }
    } catch (error) {
      // Directory might not exist or be accessible
    }
    
    return counts;
  }

  async getPerformanceData() {
    return {
      buildTime: null,
      deployTime: null,
      bundleSize: null,
      timestamp: new Date().toISOString()
    };
  }

  async pathExists(path) {
    try {
      await fs.access(path);
      return true;
    } catch {
      return false;
    }
  }
}

module.exports = DataCollector;