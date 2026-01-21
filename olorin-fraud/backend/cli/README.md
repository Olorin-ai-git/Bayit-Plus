# Olorin CLI Tool

Global command-line interface for Olorin workspace management.

## Installation

### Quick Install (Global Symlink)

```bash
cd /Users/gklainert/Documents/olorin/olorin-server
sudo ln -s $(pwd)/cli/olorin /usr/local/bin/olorin
```

### Verify Installation

```bash
which olorin
# Should output: /usr/local/bin/olorin

olorin --help
# Should show CLI help (may show Python dependency errors if not installed)
```

## Usage

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

# Re-index workspace
olorin index
```

## Troubleshooting

### "Error: olor.py not found"

This usually means the symlink is broken or the script can't resolve its location. Check:

```bash
# Verify symlink
ls -la /usr/local/bin/olorin

# Should show: /usr/local/bin/olorin -> /Users/gklainert/Documents/olorin/olorin-server/cli/olorin

# Recreate symlink if broken
sudo rm /usr/local/bin/olorin
sudo ln -s /Users/gklainert/Documents/olorin/olorin-server/cli/olorin /usr/local/bin/olorin
```

### Python Dependency Errors

If you see errors like `ModuleNotFoundError: No module named 'structlog'`, install dependencies:

```bash
cd olorin-server
pip install -r requirements.txt
# OR
poetry install
```

### Script Works But Shows Import Errors

The script itself is working correctly if it finds `olor.py`. Import errors indicate missing Python dependencies, not a script issue.

## Files

- `olorin` - Bash wrapper script (executable)
- `olor.py` - Python CLI implementation
- `INSTALL.md` - Detailed installation instructions

