/**
 * MCP Command - Interact with Model Context Protocol servers
 *
 * Provides commands for:
 * - Listing configured MCP servers
 * - Listing tools from a server
 * - Calling tools on a server
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { OlorinMcpClient, loadMcpConfig } from '../services/mcp-client.js';
import { handleError } from './ai-errors.js';

/**
 * Register MCP command with subcommands
 */
export function registerMcpCommand(program: Command): void {
  const mcpCommand = program
    .command('mcp')
    .description('Interact with MCP (Model Context Protocol) servers');

  // List configured servers
  mcpCommand
    .command('list')
    .description('List all configured MCP servers')
    .action(async () => {
      try {
        const config = await loadMcpConfig();
        const servers = Object.keys(config.mcpServers);

        if (servers.length === 0) {
          console.log(chalk.yellow('No MCP servers configured'));
          console.log(chalk.dim('Add servers to .mcp.json'));
          return;
        }

        console.log(chalk.bold('\nConfigured MCP Servers:'));
        servers.forEach(serverName => {
          const serverConfig = config.mcpServers[serverName];
          console.log(chalk.cyan(`\n  ${serverName}`));
          console.log(chalk.dim(`    Command: ${serverConfig.command}`));
          console.log(chalk.dim(`    Args: ${serverConfig.args.join(' ')}`));
        });
        console.log('');
      } catch (error) {
        handleError(error as Error);
      }
    });

  // List tools from a server
  mcpCommand
    .command('tools <server>')
    .description('List available tools from an MCP server')
    .action(async (serverName: string) => {
      const spinner = ora(`Connecting to ${serverName}...`).start();
      const client = new OlorinMcpClient();

      try {
        await client.connect(serverName);
        spinner.text = 'Fetching tools...';

        const tools = await client.listTools();

        await client.disconnect();
        spinner.succeed(`Tools from ${chalk.cyan(serverName)}:`);

        if (tools.length === 0) {
          console.log(chalk.yellow('\nNo tools available'));
          return;
        }

        console.log('');
        tools.forEach(tool => {
          console.log(chalk.bold(`  ${tool.name}`));
          if (tool.description) {
            console.log(chalk.dim(`    ${tool.description}`));
          }
          console.log(chalk.dim(`    Input schema: ${JSON.stringify(tool.inputSchema, null, 2)}`));
          console.log('');
        });
      } catch (error) {
        spinner.fail('Failed to list tools');
        await client.disconnect();
        handleError(error as Error);
      }
    });

  // Call a tool
  mcpCommand
    .command('call <server> <tool>')
    .description('Call a tool on an MCP server')
    .option('--json <json>', 'Tool arguments as JSON string')
    .option('--args <args...>', 'Tool arguments as key=value pairs')
    .action(async (serverName: string, toolName: string, options) => {
      const spinner = ora(`Connecting to ${serverName}...`).start();
      const client = new OlorinMcpClient();

      try {
        await client.connect(serverName);
        spinner.text = `Calling tool: ${toolName}...`;

        // Parse arguments
        let toolArgs: any = {};

        if (options.json) {
          try {
            toolArgs = JSON.parse(options.json);
          } catch (error) {
            spinner.fail('Invalid JSON arguments');
            await client.disconnect();
            throw new Error(`Failed to parse JSON: ${(error as Error).message}`);
          }
        } else if (options.args) {
          // Parse key=value pairs
          toolArgs = {};
          for (const arg of options.args) {
            const [key, ...valueParts] = arg.split('=');
            if (!key || valueParts.length === 0) {
              spinner.fail('Invalid argument format');
              await client.disconnect();
              throw new Error(
                `Invalid argument format: ${arg}\n` +
                'Use: --args key=value or --json \'{"key": "value"}\''
              );
            }
            toolArgs[key] = valueParts.join('=');
          }
        }

        // Call tool
        const result = await client.callTool(toolName, toolArgs);

        await client.disconnect();
        spinner.succeed('Tool call successful');

        // Display result
        console.log(chalk.bold('\nResult:'));
        console.log(JSON.stringify(result, null, 2));
        console.log('');
      } catch (error) {
        spinner.fail('Tool call failed');
        await client.disconnect();
        handleError(error as Error);
      }
    });

  // Health check for MCP server
  mcpCommand
    .command('health <server>')
    .description('Check if an MCP server is accessible')
    .action(async (serverName: string) => {
      const spinner = ora(`Checking ${serverName}...`).start();
      const client = new OlorinMcpClient();

      try {
        await client.connect(serverName);
        const tools = await client.listTools();
        await client.disconnect();

        spinner.succeed(chalk.green(`${serverName} is healthy`));
        console.log(chalk.dim(`  Available tools: ${tools.length}`));
      } catch (error) {
        spinner.fail(chalk.red(`${serverName} is not accessible`));
        await client.disconnect();
        handleError(error as Error, spinner);
      }
    });
}
