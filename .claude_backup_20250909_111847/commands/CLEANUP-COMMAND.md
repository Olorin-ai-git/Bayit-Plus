# CVPlus Global /cleanup Command

## Overview
The `/cleanup` command is a globally accessible Claude command that provides comprehensive cleanup capabilities for the CVPlus project. It handles database cleanup, cache clearing, temporary file removal, and backup management.

## Installation Status
✅ **Command Successfully Installed**

The `/cleanup` command has been configured and is ready to use. The following components have been set up:

### Installed Components:
1. **Main Script**: `/Users/gklainert/.claude/commands/cleanup.sh`
2. **Wrapper Script**: `/Users/gklainert/.claude/commands/cleanup-wrapper.sh`
3. **Direct Executor**: `/Users/gklainert/.claude/commands/cleanup-command.sh`
4. **Configuration**: `/Users/gklainert/.claude/commands.json`
5. **Shell Integration**: Added to `~/.bash_profile`

## Usage

### Basic Syntax
```bash
/cleanup [level] [options]
```

### Cleanup Levels
- **`safe`** (default): Clean temporary files, logs, and caches only
- **`moderate`**: Clean generated content and non-essential data
- **`aggressive`**: Clean all data including user records (requires confirmations)

### Available Options
| Option | Description |
|--------|-------------|
| `--dry-run` | Preview operations without executing |
| `--user <userId>` | Target specific user for cleanup |
| `--collections <list>` | Comma-separated list of collections to clean |
| `--backup-only` | Create backup without cleaning |
| `--rollback <backupId>` | Restore from a specific backup |
| `--list-backups` | List all available backups |
| `--help` | Show help message |

## Examples

### Basic Usage
```bash
# Safe cleanup (default)
/cleanup

# Moderate cleanup
/cleanup moderate

# Aggressive cleanup with preview
/cleanup aggressive --dry-run
```

### Advanced Usage
```bash
# Clean specific user data
/cleanup moderate --user user123

# Clean specific collections
/cleanup safe --collections users,sessions,analytics

# Create backup only
/cleanup --backup-only

# List available backups
/cleanup --list-backups

# Restore from backup
/cleanup --rollback backup-20240823-120000
```

## Safety Features

### Confirmation Requirements
- **Safe mode**: Single confirmation
- **Moderate mode**: Double confirmation
- **Aggressive mode**: Triple confirmation with typing requirement

### Dry Run Mode
Always preview operations before execution:
```bash
/cleanup aggressive --dry-run
```

### Automatic Backups
- Backups are created automatically before cleanup operations
- Stored in `~/.cvplus-backups/`
- Includes timestamp and cleanup level in backup name

## What Gets Cleaned

### Safe Mode
- Temporary files (`/tmp`, `.tmp`)
- Build artifacts (`dist/`, `build/`)
- Log files (`*.log`)
- Cache directories

### Moderate Mode (includes Safe)
- Node modules (`node_modules/`)
- Package lock files
- Python virtual environments
- Generated documentation
- Test coverage reports

### Aggressive Mode (includes Moderate)
- Firestore database collections
- User data and profiles
- Storage buckets
- Authentication records
- All backups and archives

## Error Handling

The command includes comprehensive error handling:
- Validates CVPlus project location
- Checks for required permissions
- Verifies backup integrity
- Provides rollback capabilities
- Detailed error messages with recovery suggestions

## Integration with Claude

### Shell Integration
The command is integrated into your shell via:
- Function definition in `~/.bash_profile`
- Alias for `/cleanup` syntax
- Auto-completion support (if enabled)

### To Activate Immediately
```bash
source ~/.bash_profile
```

### Alternative Direct Execution
If the shell alias isn't available, you can use:
```bash
/Users/gklainert/.claude/commands/cleanup-command.sh [options]
```

## Troubleshooting

### Command Not Found
If `/cleanup` is not recognized:
1. Source your shell configuration:
   ```bash
   source ~/.bash_profile
   ```
2. Or use the direct path:
   ```bash
   ~/. claude/commands/cleanup-command.sh
   ```

### Permission Denied
Make scripts executable:
```bash
chmod +x ~/.claude/commands/*.sh
```

### CVPlus Directory Not Found
Ensure CVPlus is installed at:
```
/Users/gklainert/Documents/cvplus
```

## Configuration

### Paths
- **CVPlus Directory**: `/Users/gklainert/Documents/cvplus`
- **Backup Directory**: `~/.cvplus-backups`
- **Audit Directory**: `~/.cvplus-audit`
- **Command Scripts**: `~/.claude/commands/`

### Customization
Edit `/Users/gklainert/.claude/commands.json` to:
- Modify command aliases
- Update descriptions
- Change default behaviors
- Add new parameters

## Version Information
- **Version**: 1.0.0
- **Created**: 2024-08-23
- **Author**: Gil Klainert
- **Project**: CVPlus

## Support

For issues or questions:
1. Check the help: `/cleanup --help`
2. Review dry-run output: `/cleanup [level] --dry-run`
3. Check backup availability: `/cleanup --list-backups`
4. Use rollback if needed: `/cleanup --rollback [backup-id]`

## Notes

- Always use `--dry-run` first for aggressive operations
- Backups are retained for 30 days by default
- The command requires the CVPlus project to be properly installed
- Firebase credentials must be configured for database operations