# Olorin CLI - Global Installation Guide

Make the Olorin CLI accessible from any directory.

## Quick Install (Recommended)

Run the installation script:

```bash
cd /Users/olorin/Documents/olorin/olorin-media/bayit-plus/scripts
./install-olorin-cli.sh
```

This will:
- Create symlink at `/usr/local/bin/olorin`
- Make `olorin` command available globally
- Require sudo password

## Manual Installation Methods

### Method 1: System-Wide (Recommended)

```bash
# Create symlink in /usr/local/bin
sudo ln -sf /Users/olorin/Documents/olorin/olorin-media/bayit-plus/scripts/olorin.sh /usr/local/bin/olorin

# Verify
olorin --version
```

**Pros:**
- ✅ Works from any directory
- ✅ Available for all users
- ✅ Standard installation location

**Cons:**
- ⚠️ Requires sudo access

### Method 2: User-Only (No Sudo)

```bash
# Create ~/.local/bin if it doesn't exist
mkdir -p ~/.local/bin

# Create symlink
ln -sf /Users/olorin/Documents/olorin/olorin-media/bayit-plus/scripts/olorin.sh ~/.local/bin/olorin

# Add to PATH (choose your shell)
# For Zsh:
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc

# For Bash:
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc

# Verify
olorin --version
```

**Pros:**
- ✅ No sudo required
- ✅ User-specific installation
- ✅ Follows XDG standards

**Cons:**
- ⚠️ Only available for current user
- ⚠️ Requires PATH modification

### Method 3: Add to PATH (Alternative)

Instead of creating a symlink, add the scripts directory to PATH:

```bash
# For Zsh:
echo 'export PATH="/Users/olorin/Documents/olorin/olorin-media/bayit-plus/scripts:$PATH"' >> ~/.zshrc
source ~/.zshrc

# For Bash:
echo 'export PATH="/Users/olorin/Documents/olorin/olorin-media/bayit-plus/scripts:$PATH"' >> ~/.bashrc
source ~/.bashrc

# Use with full name
olorin.sh --version

# Or create an alias
echo 'alias olorin="olorin.sh"' >> ~/.zshrc  # or ~/.bashrc
source ~/.zshrc  # or ~/.bashrc
```

**Pros:**
- ✅ No symlink needed
- ✅ No sudo required

**Cons:**
- ⚠️ Must use `olorin.sh` unless alias created
- ⚠️ Adds entire directory to PATH

## Verify Installation

After installation, verify the CLI is accessible:

```bash
# Check if command exists
which olorin

# Show version
olorin --version

# Show help
olorin --help

# Test a command
olorin status
```

## Usage from Anywhere

Once installed, you can run Olorin CLI from any directory:

```bash
# From any location
cd ~/Desktop
olorin upload-movies --dry-run

cd /tmp
olorin upload-series --series "Breaking Bad"

# Upload from URL from anywhere
olorin upload-movies --url https://example.com/movie.mp4
```

## Upload Commands

### Upload Movies

```bash
# From external drive (auto-detect)
olorin upload-movies --dry-run

# From URL
olorin upload-movies --url https://example.com/movie.mp4

# With options
olorin upload-movies --limit 5 --start-from T

# Show help
olorin upload-movies --help
```

### Upload Series

```bash
# From external drive (auto-detect)
olorin upload-series --dry-run

# From URL
olorin upload-series --url https://example.com/episode.mkv

# Specific series
olorin upload-series --series "Game of Thrones"

# Show help
olorin upload-series --help
```

### Generic Upload Menu

```bash
# Show upload options
olorin upload
```

## All Olorin Commands

```bash
# Platform management
olorin start bayit          # Start all services
olorin stop                 # Stop all services
olorin status               # Check status
olorin health               # Health check

# Development
olorin build web            # Build web app
olorin test backend         # Run tests
olorin lint                 # Run linters

# Content uploads
olorin upload-movies [opts] # Upload movies
olorin upload-series [opts] # Upload TV series
olorin upload               # Upload menu

# Script discovery
olorin script backup        # Find backup scripts

# Help
olorin --help               # Show all commands
olorin --version            # Show version
```

## Environment Variables

Set these in your shell profile for customization:

```bash
# Backend configuration
export MONGODB_URL='mongodb+srv://user:pass@cluster.mongodb.net'
export GCS_BUCKET_NAME='your-bucket'
export TMDB_API_KEY='your-tmdb-key'
export GOOGLE_APPLICATION_CREDENTIALS='/path/to/service-account.json'

# Platform defaults
export OLORIN_PLATFORM='bayit'
export BACKEND_PORT=8090
export WEB_PORT=3200
```

## Troubleshooting

### Command Not Found

```bash
# Check if symlink exists
ls -l /usr/local/bin/olorin

# Check PATH
echo $PATH | grep -o '/usr/local/bin'

# Reinstall
sudo rm /usr/local/bin/olorin
sudo ln -sf /Users/olorin/Documents/olorin/olorin-media/bayit-plus/scripts/olorin.sh /usr/local/bin/olorin
```

### Permission Denied

```bash
# Make script executable
chmod +x /Users/olorin/Documents/olorin/olorin-media/bayit-plus/scripts/olorin.sh

# Check symlink permissions
ls -l /usr/local/bin/olorin
```

### Symlink Points to Wrong Location

```bash
# Remove old symlink
sudo rm /usr/local/bin/olorin

# Create new symlink with correct path
sudo ln -sf /Users/olorin/Documents/olorin/olorin-media/bayit-plus/scripts/olorin.sh /usr/local/bin/olorin
```

## Uninstallation

Remove the CLI from your system:

```bash
# Method 1 users (system-wide)
sudo rm /usr/local/bin/olorin

# Method 2 users (user-only)
rm ~/.local/bin/olorin
# Also remove PATH modification from ~/.zshrc or ~/.bashrc

# Method 3 users (PATH addition)
# Remove PATH modification from ~/.zshrc or ~/.bashrc
```

## Update After Git Pull

The symlink points to the script file, so pulling updates automatically applies:

```bash
cd /Users/olorin/Documents/olorin/olorin-media/bayit-plus
git pull

# CLI is automatically updated (no reinstallation needed)
olorin --version
```

## Next Steps

After installation:

1. **Test the CLI:**
   ```bash
   olorin --help
   olorin status
   ```

2. **Set up environment:**
   ```bash
   cp scripts/backend/.env.upload.example scripts/backend/.env.upload
   vim scripts/backend/.env.upload
   source scripts/backend/.env.upload
   ```

3. **Try upload commands:**
   ```bash
   olorin upload-movies --dry-run
   olorin upload-series --dry-run
   ```

4. **Read full guides:**
   - `scripts/backend/MOVIE_UPLOAD_GUIDE.md`
   - `scripts/backend/SERIES_UPLOAD_GUIDE.md`
   - `scripts/backend/QUICK_REFERENCE.md`

## Support

For issues:
- Check `olorin --help`
- Review `scripts/README.md`
- Check installation: `which olorin`
- Verify PATH: `echo $PATH`
