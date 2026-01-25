/**
 * Agent Command - List and search agents from .claude/agents/
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { AgentRegistry } from '../registry/agent-registry.js';
import { logger } from '../utils/logger.js';
import type { Agent } from '../types/agent.js';

/**
 * Format agent table for display
 */
function formatAgentTable(agents: Agent[]): string {
  if (agents.length === 0) {
    return chalk.yellow('No agents found');
  }

  const lines: string[] = [];

  // Header
  lines.push(chalk.bold.cyan('\nAvailable Agents\n'));
  lines.push(chalk.gray('─'.repeat(80)));

  // Group by category
  const byCategory = agents.reduce((acc, agent) => {
    if (!acc[agent.category]) {
      acc[agent.category] = [];
    }
    acc[agent.category].push(agent);
    return acc;
  }, {} as Record<string, Agent[]>);

  // Display each category
  for (const [category, categoryAgents] of Object.entries(byCategory)) {
    lines.push(chalk.bold.magenta(`\n${category.toUpperCase()}`));

    for (const agent of categoryAgents) {
      const nameCol = chalk.green(agent.name.padEnd(30));
      const descCol = chalk.white(agent.description.substring(0, 45));
      lines.push(`  ${nameCol} ${descCol}`);
    }
  }

  lines.push(chalk.gray('\n' + '─'.repeat(80)));
  lines.push(chalk.bold(`\nTotal: ${agents.length} agents`));

  return lines.join('\n');
}

/**
 * Format agent details for single agent view
 */
function formatAgentDetails(agent: Agent): string {
  const lines: string[] = [];

  lines.push(chalk.bold.cyan(`\nAgent: ${agent.name}\n`));
  lines.push(chalk.gray('─'.repeat(80)));
  lines.push(chalk.bold('Category:    ') + chalk.magenta(agent.category));
  lines.push(chalk.bold('Description: ') + chalk.white(agent.description));

  if (agent.tools && agent.tools.length > 0) {
    lines.push(chalk.bold('\nTools:'));
    agent.tools.forEach(tool => {
      lines.push(`  ${chalk.green('•')} ${chalk.white(tool)}`);
    });
  }

  if (agent.when) {
    lines.push(chalk.bold('\nWhen to use:'));
    lines.push(chalk.white(agent.when));
  }

  lines.push(chalk.gray('\n' + '─'.repeat(80)));

  return lines.join('\n');
}

/**
 * Format category statistics
 */
function formatStats(registry: AgentRegistry): string {
  const stats = registry.getStats();
  const lines: string[] = [];

  lines.push(chalk.bold.cyan('\nAgent Statistics\n'));
  lines.push(chalk.gray('─'.repeat(80)));
  lines.push(chalk.bold('Total Agents:    ') + chalk.green(stats.totalAgents.toString()));
  lines.push(chalk.bold('Total Categories:') + chalk.green(stats.totalCategories.toString()));
  lines.push(chalk.bold('Total Presets:   ') + chalk.green(stats.totalPresets.toString()));

  lines.push(chalk.bold('\nAgents per Category:'));
  for (const [category, count] of Object.entries(stats.agentsPerCategory)) {
    const categoryName = category.padEnd(20);
    lines.push(`  ${chalk.magenta(categoryName)} ${chalk.white(count.toString())}`);
  }

  lines.push(chalk.gray('\n' + '─'.repeat(80)));

  return lines.join('\n');
}

/**
 * List command handler
 */
function handleList(options: {
  category?: string;
  search?: string;
  stats?: boolean;
  json?: boolean;
}): void {
  try {
    const registry = new AgentRegistry();

    // Show statistics
    if (options.stats) {
      if (options.json) {
        console.log(JSON.stringify(registry.getStats(), null, 2));
      } else {
        console.log(formatStats(registry));
      }
      return;
    }

    // Get agents based on filters
    let agents: Agent[];

    if (options.category) {
      agents = registry.getAgentsByCategory(options.category);
      if (agents.length === 0) {
        logger.warn(`No agents found in category: ${options.category}`);
        logger.info('Available categories: ' + registry.getCategories().join(', '));
        return;
      }
    } else if (options.search) {
      agents = registry.searchAgents(options.search);
      if (agents.length === 0) {
        logger.warn(`No agents found matching: ${options.search}`);
        return;
      }
    } else {
      agents = registry.getAllAgents();
    }

    // Output format
    if (options.json) {
      console.log(JSON.stringify(agents, null, 2));
    } else {
      console.log(formatAgentTable(agents));
    }

    logger.debug(`Displayed ${agents.length} agents`);
  } catch (error) {
    logger.error('Failed to list agents', { error });
    process.exit(1);
  }
}

/**
 * Info command handler
 */
function handleInfo(agentName: string, options: { json?: boolean }): void {
  try {
    const registry = new AgentRegistry();
    const agent = registry.getAgent(agentName);

    if (!agent) {
      logger.error(`Agent not found: ${agentName}`);
      logger.info('Run: olorin agent --list');
      process.exit(1);
    }

    if (options.json) {
      console.log(JSON.stringify(agent, null, 2));
    } else {
      console.log(formatAgentDetails(agent));
    }
  } catch (error) {
    logger.error('Failed to get agent info', { error });
    process.exit(1);
  }
}

/**
 * Categories command handler
 */
function handleCategories(options: { json?: boolean }): void {
  try {
    const registry = new AgentRegistry();
    const categories = registry.getCategories();

    if (options.json) {
      console.log(JSON.stringify(categories, null, 2));
    } else {
      console.log(chalk.bold.cyan('\nAgent Categories\n'));
      console.log(chalk.gray('─'.repeat(80)));

      categories.forEach(category => {
        const count = registry.getAgentsByCategory(category).length;
        const categoryName = category.padEnd(20);
        console.log(`  ${chalk.magenta(categoryName)} ${chalk.gray(`(${count} agents)`)}`);
      });

      console.log(chalk.gray('\n' + '─'.repeat(80)));
      console.log(chalk.bold(`\nTotal: ${categories.length} categories`));
    }
  } catch (error) {
    logger.error('Failed to list categories', { error });
    process.exit(1);
  }
}

/**
 * Register agent command
 */
export function registerAgentCommand(program: Command): void {
  const agentCommand = program
    .command('agent')
    .description('Manage and invoke Claude agents from .claude/agents/');

  // List agents
  agentCommand
    .command('list')
    .description('List all available agents')
    .option('-c, --category <category>', 'Filter by category')
    .option('-s, --search <query>', 'Search agents by name or description')
    .option('--stats', 'Show agent statistics')
    .option('--json', 'Output in JSON format')
    .action(handleList);

  // Agent info
  agentCommand
    .command('info <agent-name>')
    .description('Show detailed information about a specific agent')
    .option('--json', 'Output in JSON format')
    .action(handleInfo);

  // List categories
  agentCommand
    .command('categories')
    .description('List all agent categories')
    .option('--json', 'Output in JSON format')
    .action(handleCategories);

  // Default action - show help
  agentCommand.action(() => {
    agentCommand.help();
  });
}
