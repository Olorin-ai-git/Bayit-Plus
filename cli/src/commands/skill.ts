/**
 * Skill Command - List and search skills from .claude/skills/
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { SkillRegistry } from '../registry/skill-registry.js';
import { logger } from '../utils/logger.js';
import type { Skill } from '../types/skill.js';

/**
 * Format skill table for display
 */
function formatSkillTable(skills: Skill[]): string {
  if (skills.length === 0) {
    return chalk.yellow('No skills found');
  }

  const lines: string[] = [];

  // Header
  lines.push(chalk.bold.cyan('\nAvailable Skills\n'));
  lines.push(chalk.gray('─'.repeat(80)));

  for (const skill of skills) {
    const nameCol = chalk.green(skill.name.padEnd(30));
    const descCol = chalk.white(skill.description.substring(0, 45));
    lines.push(`  ${nameCol} ${descCol}`);
  }

  lines.push(chalk.gray('\n' + '─'.repeat(80)));
  lines.push(chalk.bold(`\nTotal: ${skills.length} skills`));

  return lines.join('\n');
}

/**
 * Format skill details for single skill view
 */
function formatSkillDetails(skill: Skill): string {
  const lines: string[] = [];

  lines.push(chalk.bold.cyan(`\nSkill: ${skill.name}\n`));
  lines.push(chalk.gray('─'.repeat(80)));
  lines.push(chalk.bold('Description:') + '\n' + chalk.white(skill.description));

  if (skill.usage) {
    lines.push(chalk.bold('\nUsage:'));
    lines.push(chalk.white(skill.usage));
  }

  if (skill.examples && skill.examples.length > 0) {
    lines.push(chalk.bold('\nExamples:'));
    skill.examples.forEach((example, idx) => {
      lines.push(chalk.gray(`\nExample ${idx + 1}:`));
      lines.push(chalk.white(example));
    });
  }

  lines.push(chalk.bold('\nLocation:'));
  lines.push(chalk.gray(skill.path));

  lines.push(chalk.gray('\n' + '─'.repeat(80)));

  return lines.join('\n');
}

/**
 * Format skill statistics
 */
function formatStats(registry: SkillRegistry): string {
  const stats = registry.getStats();
  const lines: string[] = [];

  lines.push(chalk.bold.cyan('\nSkill Statistics\n'));
  lines.push(chalk.gray('─'.repeat(80)));
  lines.push(chalk.bold('Total Skills:        ') + chalk.green(stats.totalSkills.toString()));
  lines.push(chalk.bold('Skills with Examples:') + chalk.green(stats.skillsWithExamples.toString()));
  lines.push(chalk.bold('Skills with Usage:   ') + chalk.green(stats.skillsWithUsage.toString()));

  const completeness = stats.totalSkills > 0
    ? Math.round((stats.skillsWithUsage / stats.totalSkills) * 100)
    : 0;

  lines.push(chalk.bold('\nDocumentation Completeness:') + ' ' + chalk.green(`${completeness}%`));

  lines.push(chalk.gray('\n' + '─'.repeat(80)));

  return lines.join('\n');
}

/**
 * List command handler
 */
function handleList(options: {
  search?: string;
  stats?: boolean;
  json?: boolean;
}): void {
  try {
    const registry = new SkillRegistry();

    // Show statistics
    if (options.stats) {
      if (options.json) {
        console.log(JSON.stringify(registry.getStats(), null, 2));
      } else {
        console.log(formatStats(registry));
      }
      return;
    }

    // Get skills based on filters
    let skills: Skill[];

    if (options.search) {
      skills = registry.searchSkills(options.search);
      if (skills.length === 0) {
        logger.warn(`No skills found matching: ${options.search}`);
        return;
      }
    } else {
      skills = registry.getAllSkills();
    }

    // Output format
    if (options.json) {
      console.log(JSON.stringify(skills, null, 2));
    } else {
      console.log(formatSkillTable(skills));
    }

    logger.debug(`Displayed ${skills.length} skills`);
  } catch (error) {
    logger.error('Failed to list skills', { error });
    process.exit(1);
  }
}

/**
 * Info command handler
 */
function handleInfo(skillName: string, options: { json?: boolean }): void {
  try {
    const registry = new SkillRegistry();
    const skill = registry.getSkill(skillName);

    if (!skill) {
      logger.error(`Skill not found: ${skillName}`);
      logger.info('Run: olorin skill --list');
      process.exit(1);
    }

    if (options.json) {
      console.log(JSON.stringify(skill, null, 2));
    } else {
      console.log(formatSkillDetails(skill));
    }
  } catch (error) {
    logger.error('Failed to get skill info', { error });
    process.exit(1);
  }
}

/**
 * Register skill command
 */
export function registerSkillCommand(program: Command): void {
  const skillCommand = program
    .command('skill')
    .description('Manage and execute skills from .claude/skills/');

  // List skills
  skillCommand
    .command('list')
    .description('List all available skills')
    .option('-s, --search <query>', 'Search skills by name or description')
    .option('--stats', 'Show skill statistics')
    .option('--json', 'Output in JSON format')
    .action(handleList);

  // Skill info
  skillCommand
    .command('info <skill-name>')
    .description('Show detailed information about a specific skill')
    .option('--json', 'Output in JSON format')
    .action(handleInfo);

  // Default action - show help
  skillCommand.action(() => {
    skillCommand.help();
  });
}
