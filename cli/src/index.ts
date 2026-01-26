#!/usr/bin/env node
/**
 * Olorin CLI - TypeScript Entry Point
 *
 * Complex command handler for agent, skill, deploy, and config commands.
 * Bash router delegates to this for 10% of complex workflows.
 */

import { Command } from 'commander';
import { registerAgentCommand } from './commands/agent.js';
import { registerSkillCommand } from './commands/skill.js';
import { registerStartCommand } from './commands/start.js';
import { registerStopCommand } from './commands/stop.js';
import { registerStatusCommand } from './commands/status.js';
import { registerAiCommand } from './commands/ai.js';
import { registerMcpCommand } from './commands/mcp.js';
import { logger } from './utils/logger.js';

// CLI metadata
const program = new Command();

program
  .name('olorin')
  .description('Olorin CLI - Unified tooling for Olorin ecosystem')
  .version('1.0.0');

// Register commands
registerAgentCommand(program);
registerSkillCommand(program);
registerStartCommand(program);
registerStopCommand(program);
registerStatusCommand(program);
registerAiCommand(program);
registerMcpCommand(program);

// Global options
program
  .option('--log-level <level>', 'Set log level (debug, info, warn, error)', 'info')
  .option('--json', 'Output in JSON format', false);

// Parse arguments
program.parse(process.argv);

// Handle no command
if (!process.argv.slice(2).length) {
  program.outputHelp();
}

// Handle errors
process.on('unhandledRejection', (error) => {
  logger.error('Unhandled promise rejection', { error });
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', { error });
  process.exit(1);
});
