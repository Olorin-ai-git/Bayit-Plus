#!/usr/bin/env node

/**
 * CVPlus Unified Module Requirements Server
 * Standalone server for the module requirements validation system
 */

import { ModuleRequirementsServer } from '../api/server';
import { config } from '../config/environment';

const server = new ModuleRequirementsServer();

async function startServer() {
  try {
    console.log('🚀 Starting CVPlus Unified Module Requirements Server...');
    console.log(`📊 Environment: ${config.environment}`);
    console.log(`🔧 Log Level: ${config.logLevel}`);
    console.log(`⚡ Max Concurrent Validations: ${config.maxConcurrentValidations}`);
    console.log(`🛡️  Strict Mode: ${config.enableStrictMode ? 'Enabled' : 'Disabled'}`);

    await server.start();

    console.log(`✅ Server started successfully!`);
    console.log(`🌐 Server running at: http://${config.host}:${config.port}`);
    console.log(`📖 API Documentation: http://${config.host}:${config.port}/api/${config.apiVersion}/docs`);
    console.log(`💚 Health Check: http://${config.host}:${config.port}/health`);

    // Handle graceful shutdown
    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

async function gracefulShutdown(signal: string) {
  console.log(`\n📡 Received ${signal}. Starting graceful shutdown...`);

  try {
    await server.stop();
    console.log('✅ Server stopped gracefully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the server
startServer();