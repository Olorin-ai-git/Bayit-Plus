# Installing Olorin CLI Globally

The `olorin` command provides a global CLI interface for Olorin workspace management.

**Note**: The script automatically uses Poetry if available, ensuring all dependencies are properly loaded.

## Prerequisites

- Python 3.11 or later
- Poetry (recommended) - The script will use Poetry if available, otherwise falls back to direct Python execution
- Dependencies installed: `cd olorin-server && poetry install`

## Installation Methods

### Method 1: Symlink to /usr/local/bin (Recommended)

```bash
cd /Users/gklainert/Documents/olorin/olorin-server
sudo ln -s $(pwd)/cli/olorin /usr/local/bin/olorin
```

**Verify installation:**
```bash
which olorin
olorin --help
```

### Method 2: Add to PATH

Add the CLI directory to your PATH in `~/.bashrc` or `~/.zshrc`:

```bash
# For bash
echo 'export PATH="$PATH:/Users/gklainert/Documents/olorin/olorin-server/cli"' >> ~/.bashrc
source ~/.bashrc

# For zsh
echo 'export PATH="$PATH:/Users/gklainert/Documents/olorin/olorin-server/cli"' >> ~/.zshrc
source ~/.zshrc
```

**Verify installation:**
```bash
which olorin
olorin --help
```

### Method 3: Create Alias

Add an alias to your shell configuration:

```bash
# For bash
echo 'alias olorin="python3 /Users/gklainert/Documents/olorin/olorin-server/cli/olor.py"' >> ~/.bashrc
source ~/.bashrc

# For zsh
echo 'alias olorin="python3 /Users/gklainert/Documents/olorin/olorin-server/cli/olor.py"' >> ~/.zshrc
source ~/.zshrc
```

## Usage

Once installed, use `olorin` from anywhere:

```bash
# List investigations
olorin ls

# List investigations for specific entity
olorin ls --entity-type email --entity-id "moeller2media@gmail.com"

# Show investigation details
olorin show <investigation_id>

# Initialize workspace
olorin init

# Create new investigation
olorin new --entity-type email --entity-id "test@example.com" --title "Test"

# Generate report
olorin report <investigation_id>

# Create comparison
olorin compare <inv_id_1> <inv_id_2>

# Re-index workspace
olorin index
```

## Troubleshooting

### Command Not Found

If you get "command not found", ensure:
1. The script is executable: `chmod +x cli/olorin`
2. The PATH includes the CLI directory (Method 2) or symlink exists (Method 1)
3. Your shell configuration is reloaded: `source ~/.bashrc` or `source ~/.zshrc`

### Python Not Found

Ensure Python 3.11+ is installed:
```bash
python3 --version
# Should show Python 3.11.x or later
```

### Missing Dependencies

If you see import errors, install dependencies using Poetry:

```bash
cd olorin-server
poetry install
```

The script automatically uses Poetry if available, so dependencies will be loaded from the Poetry environment.

### Permission Denied

If using symlink method, ensure you have write access to `/usr/local/bin`:
```bash
# Check permissions
ls -la /usr/local/bin/olorin

# Fix permissions if needed
sudo chmod +x /usr/local/bin/olorin
```

## Uninstallation

### Remove Symlink
```bash
sudo rm /usr/local/bin/olorin
```

### Remove from PATH
Edit `~/.bashrc` or `~/.zshrc` and remove the PATH export line, then reload:
```bash
source ~/.bashrc  # or source ~/.zshrc
```

### Remove Alias
Edit `~/.bashrc` or `~/.zshrc` and remove the alias line, then reload:
```bash
source ~/.bashrc  # or source ~/.zshrc
```

