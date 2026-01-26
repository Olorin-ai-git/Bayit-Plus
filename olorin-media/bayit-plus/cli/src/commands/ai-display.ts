/**
 * AI Command Display Helpers
 */

import chalk from 'chalk';
import { Ora } from 'ora';

/**
 * Display agent execution results
 */
export function displayAgentResult(result: any, spinner: Ora): void {
  if (result.success) {
    spinner.succeed(chalk.green('Agent execution complete'));
  } else {
    spinner.fail(chalk.red('Agent execution failed'));
  }

  console.log(chalk.bold('\n📋 Execution Summary:'));
  console.log(chalk.white(result.summary));

  if (result.tool_calls && result.tool_calls.length > 0) {
    console.log(chalk.bold('\n🔧 Tool Calls:'));
    result.tool_calls.forEach((call: any, i: number) => {
      console.log(chalk.cyan(`  ${i + 1}. ${call.tool}`));
      console.log(chalk.gray(`     Input: ${JSON.stringify(call.input).substring(0, 100)}...`));
      const output = call.output.length > 150
        ? call.output.substring(0, 150) + '...'
        : call.output;
      console.log(chalk.gray(`     Output: ${output}`));
    });
  }

  console.log(chalk.bold('\n📊 Statistics:'));
  console.log(chalk.white(`  Iterations: ${result.iterations}`));
  console.log(chalk.white(`  Total cost: ${chalk.yellow('$' + result.total_cost.toFixed(4))}`));

  if (result.error) {
    console.log(chalk.red(`\n❌ Error: ${result.error}`));
  }
}

/**
 * Display search results
 */
export function displaySearchResults(results: any): void {
  console.log(chalk.bold(`\n🔍 Search Results for: "${results.query}"`));
  console.log(chalk.gray(`Found ${results.total_found} items\n`));

  if (results.results.length === 0) {
    console.log(chalk.yellow('No results found.'));
    return;
  }

  results.results.forEach((result: any, i: number) => {
    const relevanceBar = '█'.repeat(Math.floor(result.relevance_score * 10));
    const relevanceColor = result.relevance_score > 0.8 ? chalk.green
      : result.relevance_score > 0.5 ? chalk.yellow
      : chalk.red;

    console.log(chalk.bold(`${i + 1}. ${result.title}`));
    console.log(chalk.gray(`   Type: ${result.content_type}`));
    console.log(relevanceColor(`   Relevance: ${relevanceBar} ${(result.relevance_score * 100).toFixed(0)}%`));

    if (result.description) {
      const desc = result.description.substring(0, 100);
      console.log(chalk.gray(`   ${desc}${result.description.length > 100 ? '...' : ''}`));
    }

    console.log(); // Blank line
  });
}

/**
 * Display health status
 */
export function displayHealthStatus(health: any): void {
  console.log(chalk.bold('\n📊 Service Status:'));
  console.log(chalk.white(`  Status: ${health.status}`));
  console.log(chalk.white(`  NLP Enabled: ${health.nlp_enabled ? chalk.green('✓') : chalk.red('✗')}`));
  console.log(chalk.white(`  Voice Commands: ${health.voice_commands_enabled ? chalk.green('✓') : chalk.red('✗')}`));
  console.log(chalk.white(`  Semantic Search: ${health.semantic_search_enabled ? chalk.green('✓') : chalk.red('✗')}`));
  console.log(chalk.white(`  Anthropic API: ${health.anthropic_api_configured ? chalk.green('✓') : chalk.red('✗')}`));

  if (!health.nlp_enabled) {
    console.log(chalk.yellow('\n⚠️  NLP features are disabled'));
    console.log(chalk.white('   Set OLORIN_NLP_ENABLED=true in backend/.env to enable'));
  }
}
