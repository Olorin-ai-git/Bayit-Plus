/**
 * AI Command - Execute natural language commands and voice workflows
 *
 * Commands:
 * - olorin ai ask <query>    - Execute natural language command
 * - olorin ai search <query> - Search content with natural language
 * - olorin ai chat           - Interactive conversation mode
 * - olorin ai i              - Alias for chat (interactive)
 * - olorin ai voice          - Execute voice command (microphone)
 * - olorin ai health         - Check NLP service health
 * - olorin ai <query>        - Shorthand for "ask"
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { NlpClient } from '../services/nlp-client.js';
import { displayAgentResult, displaySearchResults, displayHealthStatus } from './ai-display.js';
import { handleError } from './ai-errors.js';
import { runInteractiveMode } from './ai-interactive.js';
import { ActionMode } from '../services/nlp-types.js';

/**
 * Register AI command and subcommands
 */
export function registerAiCommand(program: Command): void {
  const aiCommand = program
    .command('ai')
    .description('Execute commands using natural language or voice');

  // Subcommand: ask
  aiCommand
    .command('ask <query>')
    .description('Execute natural language command')
    .option('--dry-run', 'Preview without executing', false)
    .option('--platform <platform>', 'Target platform (bayit, fraud, cvplus)', 'bayit')
    .option('--max-iterations <n>', 'Max agent iterations', '20')
    .option('--budget <amount>', 'Max cost in USD', '0.50')
    .action(async (query: string, options) => {
      const spinner = ora('Processing your request...').start();

      try {
        const client = new NlpClient();

        // Check health first
        try {
          const health = await client.healthCheck();
          if (!health.nlp_enabled) {
            throw new Error('NLP features are disabled on the backend');
          }
        } catch (error) {
          throw error;
        }

        // Execute agent workflow
        const result = await client.executeAgent({
          query,
          platform: options.platform,
          dryRun: options.dryRun,
          maxIterations: parseInt(options.maxIterations),
          budgetLimit: parseFloat(options.budget),
        });

        displayAgentResult(result, spinner);
        process.exit(result.success ? 0 : 1);
      } catch (error) {
        handleError(error as Error, spinner);
        process.exit(1);
      }
    });

  // Subcommand: search
  aiCommand
    .command('search <query>')
    .description('Search content using natural language')
    .option('-t, --type <type>', 'Filter by type (series, movies, podcasts, radio)', 'all')
    .option('-l, --limit <limit>', 'Max results', '20')
    .option('--no-rerank', 'Disable semantic re-ranking')
    .option('--json', 'Output as JSON')
    .action(async (query: string, options) => {
      const spinner = ora('Searching...').start();

      try {
        const client = new NlpClient();

        const results = await client.searchContent(query, {
          contentType: options.type,
          limit: parseInt(options.limit),
          rerank: options.rerank,
        });

        spinner.stop();

        if (options.json) {
          console.log(JSON.stringify(results, null, 2));
        } else {
          displaySearchResults(results);
        }

        process.exit(0);
      } catch (error) {
        handleError(error as Error, spinner);
        process.exit(1);
      }
    });

  // Subcommand: chat (interactive mode)
  aiCommand
    .command('chat')
    .description('Interactive conversation mode with session support')
    .option('--platform <platform>', 'Target platform (bayit, fraud, cvplus)', 'bayit')
    .option('--action-mode <mode>', 'Action mode: smart (confirm destructive) or confirm_all', 'smart')
    .option('--budget <amount>', 'Max cost per query in USD', '0.50')
    .option('--max-iterations <n>', 'Max agent iterations per query', '20')
    .action(async (options) => {
      try {
        await runInteractiveMode({
          platform: options.platform,
          actionMode: options.actionMode as ActionMode,
          budget: parseFloat(options.budget),
          maxIterations: parseInt(options.maxIterations),
        });
      } catch (error) {
        process.stderr.write(chalk.red(`Error: ${(error as Error).message}\n`));
        process.exit(1);
      }
    });

  // Subcommand: i (alias for chat)
  aiCommand
    .command('i')
    .description('Interactive mode (alias for chat)')
    .option('--platform <platform>', 'Target platform (bayit, fraud, cvplus)', 'bayit')
    .option('--action-mode <mode>', 'Action mode: smart or confirm_all', 'smart')
    .option('--budget <amount>', 'Max cost per query in USD', '0.50')
    .option('--max-iterations <n>', 'Max agent iterations per query', '20')
    .action(async (options) => {
      try {
        await runInteractiveMode({
          platform: options.platform,
          actionMode: options.actionMode as ActionMode,
          budget: parseFloat(options.budget),
          maxIterations: parseInt(options.maxIterations),
        });
      } catch (error) {
        process.stderr.write(chalk.red(`Error: ${(error as Error).message}\n`));
        process.exit(1);
      }
    });

  // Subcommand: voice (placeholder)
  aiCommand
    .command('voice')
    .description('Execute voice command (requires microphone)')
    .option('--platform <platform>', 'Target platform', 'bayit')
    .option('--language <lang>', 'Language code (en, he, es)', 'en')
    .option('--dry-run', 'Preview without executing', false)
    .action(async (_options) => {
      process.stdout.write(chalk.yellow('\n Voice command mode\n'));
      process.stdout.write(chalk.gray('Note: Voice recording requires additional setup\n\n'));
      process.stdout.write(chalk.red('Voice command not yet implemented in CLI\n'));
      process.stdout.write(chalk.yellow('Voice commands are available via the backend API:\n'));
      process.stdout.write(chalk.white('   POST /api/v1/nlp/voice-command\n'));
      process.exit(1);
    });

  // Shorthand: olorin ai "<query>" (no subcommand)
  aiCommand
    .argument('[query...]', 'Natural language command (shorthand for "ask")')
    .action(async (queryParts: string[], _options, command: Command) => {
      if (!queryParts || queryParts.length === 0) {
        command.help();
        return;
      }

      const query = queryParts.join(' ');
      const askCommand = command.commands.find((cmd: Command) => cmd.name() === 'ask');
      if (askCommand) {
        // Pass the query as the argument, not 'ask'
        await askCommand.parseAsync([query], { from: 'user' });
      }
    });

  // Health check command
  aiCommand
    .command('health')
    .description('Check NLP service health')
    .action(async () => {
      const spinner = ora('Checking NLP service health...').start();

      try {
        const client = new NlpClient();
        const health = await client.healthCheck();

        spinner.succeed(chalk.green('NLP service is healthy'));
        displayHealthStatus(health);
        process.exit(0);
      } catch (error) {
        handleError(error as Error, spinner);
        process.exit(1);
      }
    });
}
