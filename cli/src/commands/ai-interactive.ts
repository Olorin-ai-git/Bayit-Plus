/**
 * AI Interactive Mode - REPL-based conversation with NLP agent
 *
 * Features:
 * - Readline-based REPL with command history
 * - Session tracking with cost display
 * - Pending action confirmation flow
 * - Graceful shutdown with cleanup
 */

import * as readline from 'readline';
import chalk from 'chalk';
import ora, { Ora } from 'ora';
import { NlpClient } from '../services/nlp-client.js';
import { logger } from '../utils/logger.js';
import {
  ActionMode,
  AgentExecutionResult,
  PendingAction,
  SessionInfo,
} from '../services/nlp-types.js';
import { displayAgentResult } from './ai-display.js';

export interface InteractiveOptions {
  platform: string;
  actionMode: ActionMode;
  budget: number;
  maxIterations: number;
}

interface CommandHistory {
  query: string;
  timestamp: Date;
  cost: number;
  success: boolean;
}

/**
 * Interactive session manager for REPL mode
 */
class InteractiveSession {
  private client: NlpClient;
  private session: SessionInfo | null = null;
  private rl: readline.Interface | null = null;
  private isRunning = true;
  private currentAbortController: AbortController | null = null;
  private currentSpinner: Ora | null = null;
  private pendingActions: PendingAction[] = [];
  private commandHistory: CommandHistory[] = [];
  private totalSessionCost = 0;

  constructor(
    private options: InteractiveOptions
  ) {
    this.client = new NlpClient();
  }

  async start(): Promise<void> {
    await this.initialize();
    await this.runRepl();
  }

  private async initialize(): Promise<void> {
    const spinner = ora('Connecting to NLP service...').start();

    try {
      const health = await this.client.healthCheck();
      if (!health.nlp_enabled) {
        spinner.fail(chalk.red('NLP features are disabled on the backend'));
        process.exit(1);
      }

      this.session = await this.client.createSession({
        platform: this.options.platform,
        actionMode: this.options.actionMode,
      });

      spinner.succeed(chalk.green('Connected to NLP service'));
      logger.debug('Session created', { sessionId: this.session.session_id });

      this.displayWelcome();
    } catch (error) {
      spinner.fail(chalk.red('Failed to connect to NLP service'));
      logger.error('Initialization failed', { error: (error as Error).message });
      throw error;
    }
  }

  private displayWelcome(): void {
    process.stdout.write('\n');
    process.stdout.write(chalk.bold.cyan('  Olorin Interactive Mode\n'));
    process.stdout.write(chalk.gray(`  Platform: ${this.options.platform}\n`));
    process.stdout.write(chalk.gray(`  Action Mode: ${this.options.actionMode}\n`));
    process.stdout.write(chalk.gray(`  Session: ${this.session?.session_id.slice(0, 8)}...\n`));
    process.stdout.write('\n');
    process.stdout.write(chalk.yellow('  Type "help" for commands, "exit" to quit\n'));
    process.stdout.write('\n');
  }

  private async runRepl(): Promise<void> {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: chalk.green('olorin> '),
      historySize: 100,
      terminal: true,
    });

    this.setupSignalHandlers();

    this.rl.prompt();

    for await (const line of this.rl) {
      if (!this.isRunning) break;

      const trimmed = line.trim();
      if (trimmed.length === 0) {
        this.rl.prompt();
        continue;
      }

      await this.processInput(trimmed);

      if (this.isRunning) {
        this.rl.prompt();
      }
    }

    await this.cleanup();
  }

  private setupSignalHandlers(): void {
    process.on('SIGINT', () => this.handleInterrupt());
    process.on('SIGTERM', () => this.handleShutdown());

    this.rl?.on('close', () => {
      this.handleShutdown();
    });
  }

  private handleInterrupt(): void {
    if (this.currentSpinner) {
      this.currentSpinner.stop();
      this.currentSpinner = null;
    }

    if (this.currentAbortController) {
      this.currentAbortController.abort();
      this.currentAbortController = null;
      process.stdout.write(chalk.yellow('\n(Operation cancelled. Press Ctrl+D to exit)\n'));
      this.rl?.prompt();
    } else {
      process.stdout.write(chalk.yellow('\n(Press Ctrl+D to exit)\n'));
      this.rl?.prompt();
    }
  }

  private handleShutdown(): void {
    if (!this.isRunning) return;
    this.isRunning = false;

    process.stdout.write(chalk.yellow('\nShutting down...\n'));
    this.cleanup().then(() => {
      process.exit(0);
    });
  }

  private async cleanup(): Promise<void> {
    if (this.session) {
      try {
        const summary = await this.client.endSession(this.session.session_id);
        this.displaySessionSummary(summary.total_cost);
      } catch (error) {
        logger.warn('Failed to end session', { error: (error as Error).message });
      }
    }

    this.rl?.close();
  }

  private displaySessionSummary(totalCost?: number): void {
    const cost = totalCost ?? this.totalSessionCost;
    process.stdout.write('\n');
    process.stdout.write(chalk.bold.cyan('Session Summary\n'));
    process.stdout.write(chalk.white(`  Total queries: ${this.commandHistory.length}\n`));
    process.stdout.write(chalk.white(`  Total cost: ${chalk.yellow('$' + cost.toFixed(4))}\n`));
    process.stdout.write(chalk.white(`  Successful: ${this.commandHistory.filter(h => h.success).length}\n`));
    process.stdout.write('\n');
  }

  private async processInput(input: string): Promise<void> {
    const parts = input.split(/\s+/);
    const command = parts[0].toLowerCase();

    switch (command) {
      case 'help':
        this.showHelp();
        break;
      case 'exit':
      case 'quit':
      case 'q':
        this.handleShutdown();
        break;
      case 'cost':
        this.showCost();
        break;
      case 'history':
        this.showHistory();
        break;
      case 'confirm':
        await this.confirmAction(parts[1]);
        break;
      case 'pending':
        this.showPendingActions();
        break;
      case 'clear':
        this.clearScreen();
        break;
      default:
        await this.executeQuery(input);
        break;
    }
  }

  private showHelp(): void {
    process.stdout.write('\n');
    process.stdout.write(chalk.bold.cyan('Available Commands:\n'));
    process.stdout.write('\n');
    process.stdout.write(chalk.white('  help           ') + chalk.gray('Show this help message\n'));
    process.stdout.write(chalk.white('  exit, quit, q  ') + chalk.gray('Exit interactive mode\n'));
    process.stdout.write(chalk.white('  cost           ') + chalk.gray('Show current session cost\n'));
    process.stdout.write(chalk.white('  history        ') + chalk.gray('Show command history\n'));
    process.stdout.write(chalk.white('  pending        ') + chalk.gray('Show pending confirmations\n'));
    process.stdout.write(chalk.white('  confirm <id>   ') + chalk.gray('Confirm a pending action\n'));
    process.stdout.write(chalk.white('  clear          ') + chalk.gray('Clear the screen\n'));
    process.stdout.write('\n');
    process.stdout.write(chalk.gray('  Any other input is processed as a natural language query.\n'));
    process.stdout.write('\n');
  }

  private showCost(): void {
    process.stdout.write('\n');
    process.stdout.write(chalk.bold(`Session Cost: ${chalk.yellow('$' + this.totalSessionCost.toFixed(4))}\n`));
    process.stdout.write(chalk.gray(`  Queries: ${this.commandHistory.length}\n`));
    if (this.commandHistory.length > 0) {
      const avgCost = this.totalSessionCost / this.commandHistory.length;
      process.stdout.write(chalk.gray(`  Avg per query: $${avgCost.toFixed(4)}\n`));
    }
    process.stdout.write('\n');
  }

  private showHistory(): void {
    process.stdout.write('\n');
    if (this.commandHistory.length === 0) {
      process.stdout.write(chalk.gray('  No commands in history\n'));
    } else {
      process.stdout.write(chalk.bold.cyan('Command History:\n'));
      process.stdout.write('\n');
      this.commandHistory.slice(-10).forEach((entry, i) => {
        const status = entry.success ? chalk.green('[ok]') : chalk.red('[err]');
        const query = entry.query.length > 50
          ? entry.query.slice(0, 50) + '...'
          : entry.query;
        process.stdout.write(`  ${status} ${chalk.white(query)} ${chalk.gray('($' + entry.cost.toFixed(4) + ')')}\n`);
      });
    }
    process.stdout.write('\n');
  }

  private showPendingActions(): void {
    process.stdout.write('\n');
    if (this.pendingActions.length === 0) {
      process.stdout.write(chalk.gray('  No pending actions\n'));
    } else {
      process.stdout.write(chalk.bold.yellow('Pending Confirmations:\n'));
      process.stdout.write('\n');
      this.pendingActions.forEach((action, i) => {
        process.stdout.write(chalk.white(`  [${i + 1}] ${action.action_type}\n`));
        process.stdout.write(chalk.gray(`      ${action.description}\n`));
        process.stdout.write(chalk.cyan(`      ID: ${action.action_id}\n`));
        process.stdout.write('\n');
      });
      process.stdout.write(chalk.yellow(`  Type 'confirm <id>' or 'confirm ${this.pendingActions.length > 0 ? '1' : '<number>'}' to execute\n`));
    }
    process.stdout.write('\n');
  }

  private async confirmAction(actionIdOrIndex: string | undefined): Promise<void> {
    if (!actionIdOrIndex) {
      process.stdout.write(chalk.red('  Usage: confirm <action_id or number>\n'));
      return;
    }

    let action: PendingAction | undefined;

    const index = parseInt(actionIdOrIndex);
    if (!isNaN(index) && index > 0 && index <= this.pendingActions.length) {
      action = this.pendingActions[index - 1];
    } else {
      action = this.pendingActions.find(a => a.action_id === actionIdOrIndex);
    }

    if (!action) {
      process.stdout.write(chalk.red(`  Action not found: ${actionIdOrIndex}\n`));
      process.stdout.write(chalk.gray('  Use "pending" to see available actions\n'));
      return;
    }

    const spinner = ora(`Executing ${action.action_type}...`).start();
    this.currentSpinner = spinner;

    try {
      const result = await this.client.confirmAction(
        this.session!.session_id,
        action.action_id
      );

      this.pendingActions = this.pendingActions.filter(a => a.action_id !== action!.action_id);

      if (result.success) {
        spinner.succeed(chalk.green(`Action executed: ${action.action_type}`));
        process.stdout.write(chalk.white(`  Result: ${result.result}\n`));
      } else {
        spinner.fail(chalk.red(`Action failed: ${action.action_type}`));
        if (result.error) {
          process.stdout.write(chalk.red(`  Error: ${result.error}\n`));
        }
      }
    } catch (error) {
      spinner.fail(chalk.red('Failed to confirm action'));
      process.stdout.write(chalk.red(`  Error: ${(error as Error).message}\n`));
    } finally {
      this.currentSpinner = null;
    }
  }

  private clearScreen(): void {
    process.stdout.write('\x1B[2J\x1B[0f');
    this.displayWelcome();
  }

  private async executeQuery(query: string): Promise<void> {
    if (!this.session) {
      process.stdout.write(chalk.red('  No active session\n'));
      return;
    }

    const spinner = ora('Processing your request...').start();
    this.currentSpinner = spinner;
    this.currentAbortController = new AbortController();

    try {
      const result = await this.client.executeAgent({
        query,
        platform: this.options.platform,
        sessionId: this.session.session_id,
        actionMode: this.options.actionMode,
        maxIterations: this.options.maxIterations,
        budgetLimit: this.options.budget,
      });

      this.updateFromResult(query, result);
      this.displayResult(result, spinner);
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        spinner.stop();
        process.stdout.write(chalk.yellow('  Operation cancelled\n'));
      } else {
        spinner.fail(chalk.red('Request failed'));
        process.stdout.write(chalk.red(`  Error: ${(error as Error).message}\n`));
        this.commandHistory.push({
          query,
          timestamp: new Date(),
          cost: 0,
          success: false,
        });
      }
    } finally {
      this.currentSpinner = null;
      this.currentAbortController = null;
    }
  }

  private updateFromResult(query: string, result: AgentExecutionResult): void {
    this.totalSessionCost += result.total_cost;

    this.commandHistory.push({
      query,
      timestamp: new Date(),
      cost: result.total_cost,
      success: result.success,
    });

    if (result.pending_confirmations && result.pending_confirmations.length > 0) {
      this.pendingActions.push(...result.pending_confirmations);
    }
  }

  private displayResult(result: AgentExecutionResult, spinner: Ora): void {
    displayAgentResult(result, spinner);

    if (result.pending_confirmations && result.pending_confirmations.length > 0) {
      process.stdout.write('\n');
      process.stdout.write(chalk.bold.yellow('Pending Confirmations Required:\n'));
      result.pending_confirmations.forEach((action, i) => {
        process.stdout.write(chalk.white(`  [${i + 1}] ${action.action_type}: ${action.description}\n`));
        process.stdout.write(chalk.cyan(`      confirm ${action.action_id}\n`));
      });
      process.stdout.write('\n');
    }

    process.stdout.write(chalk.gray(`Session cost: $${this.totalSessionCost.toFixed(4)}\n`));
    process.stdout.write('\n');
  }
}

/**
 * Run interactive mode
 */
export async function runInteractiveMode(options: InteractiveOptions): Promise<void> {
  const session = new InteractiveSession(options);
  await session.start();
}
