/**
 * AI Command Error Handling
 */

import chalk from 'chalk';
import { Ora } from 'ora';
import { logger } from '../utils/logger.js';

/**
 * Handle and display error
 */
export function handleError(error: Error, spinner?: Ora): void {
  if (spinner) {
    spinner.fail(chalk.red('Operation failed'));
  }

  console.error(chalk.red('\n❌ Error:'), error.message);

  if (error.message.includes('NLP features are disabled')) {
    console.log(chalk.yellow('\n💡 To enable NLP features:'));
    console.log(chalk.white('   1. Set OLORIN_NLP_ENABLED=true in backend/.env'));
    console.log(chalk.white('   2. Set ANTHROPIC_API_KEY in backend/.env'));
    console.log(chalk.white('   3. Restart backend server'));
  } else if (error.message.includes('ECONNREFUSED') || error.message.includes('fetch failed')) {
    console.log(chalk.yellow('\n💡 Backend server not running:'));
    console.log(chalk.white('   Start backend: cd backend && poetry run uvicorn app.main:app --reload'));
  }

  logger.error('Command failed', { error: error.message });
}
