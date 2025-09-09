# MCP Server Management

This document describes how to manage MCP (Model Context Protocol) servers centrally across all Claude Code projects.

## Overview

All MCP server configurations are centrally managed in `~/.claude/mcp-servers.json`. This allows for:
- Consistent MCP server definitions across projects
- Easy updates to server configurations
- Standardized presets for different project types
- Version control of MCP server configurations

## Configuration File Structure

The `mcp-servers.json` file contains:

### MCP Servers
Individual server definitions with:
- **description**: What the server does
- **command**: The command to run the server
- **args**: Arguments for the command
- **category**: Server category (development, data, memory, productivity)

### Server Categories
Logical groupings of servers:
- **development**: Software development tools
- **data**: Data collection and processing
- **memory**: Context and memory management
- **productivity**: Project management tools

### Presets
Pre-configured sets of servers for common use cases:
- **minimal**: Basic functionality only
- **development**: Full coding environment
- **data-processing**: Data-focused setup
- **full**: All available servers

## Usage

### For New Projects

1. Choose an appropriate preset based on project needs
2. Copy the MCP servers from the preset to your project's settings
3. Add project-specific configurations if needed

Example for a development project:
```bash
# Copy development preset servers to project
# Add to .claude/settings.local.json or settings.json
```

### For Existing Projects

1. Review current MCP server usage
2. Compare with central configuration
3. Update to use standardized definitions
4. Remove redundant or outdated server configurations

### Adding New MCP Servers

1. Add the server definition to `~/.claude/mcp-servers.json`
2. Assign appropriate category
3. Update relevant presets
4. Update documentation

### Updating Server Configurations

1. Modify the central configuration file
2. Update version number
3. Notify all projects using the affected servers
4. Test configurations in development environment

## Available MCP Servers

### Development Servers
- **claude-context**: Codebase indexing and semantic search
- **ide**: VS Code and editor integration
- **github**: GitHub repository operations
- **context7**: Advanced documentation and code context

### Memory Servers
- **basic-memory**: Persistent context management

### Productivity Servers
- **task-master**: Project planning and task tracking

### Data Servers
- **brightdata**: Web scraping and data collection

## Best Practices

1. **Use Presets**: Start with a preset and customize only when necessary
2. **Keep Configurations Synchronized**: Regularly update projects from central config
3. **Test Before Deployment**: Test MCP server configurations in development
4. **Document Custom Configurations**: Document any project-specific customizations
5. **Version Control**: Track changes to the central configuration file

## Troubleshooting

### Common Issues

1. **Server Not Starting**: Check command and args in configuration
2. **Missing Dependencies**: Ensure required packages are installed
3. **Permission Errors**: Verify file permissions and access rights
4. **Network Issues**: Check connectivity for remote MCP servers

### Debugging Steps

1. Verify server configuration syntax
2. Test server command manually
3. Check Claude Code logs for error messages
4. Validate network connectivity for remote servers

## Commands

### View Available Servers
```bash
cat ~/.claude/mcp-servers.json | jq '.mcpServers | keys'
```

### Show Server Details
```bash
cat ~/.claude/mcp-servers.json | jq '.mcpServers["server-name"]'
```

### List Presets
```bash
cat ~/.claude/mcp-servers.json | jq '.presets'
```

### Validate Configuration
```bash
# Check JSON syntax
cat ~/.claude/mcp-servers.json | jq '.'
```