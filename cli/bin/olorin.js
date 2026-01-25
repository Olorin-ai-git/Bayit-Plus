#!/usr/bin/env node

/**
 * Olorin CLI - Entry Point
 *
 * This is the executable entry point for the TypeScript CLI.
 * Bash router delegates complex commands (agent, skill, deploy, config) to this.
 */

// Import and run the TypeScript CLI
import('../dist/index.js').catch((error) => {
  console.error('Failed to start Olorin CLI:', error.message);
  process.exit(1);
});
