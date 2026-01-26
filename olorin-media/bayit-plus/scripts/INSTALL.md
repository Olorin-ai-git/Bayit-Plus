# Olorin CLI - Installation Guide

Quick guide to install Olorin CLI on any machine.

## Prerequisites

- Git
- Bash or Zsh shell
- macOS or Linux

## Quick Install

### 1. Clone Repository

```bash
git clone <repository-url>
cd bayit-plus/scripts
```

### 2. Run Installer

```bash
./install.sh
```

### 3. Choose Installation Method

The installer will prompt you to choose:

**Option 1: System-wide (Recommended)**
- Requires: `sudo` access
- Location: `/usr/local/bin/olorin`
- Available: All users
- Command: `olorin`

**Option 2: User-only (No Sudo)**
- Requires: Nothing (no sudo)
- Location: `~/.local/bin/olorin`
- Available: Current user only
- Command: `olorin`

**Option 3: PATH Addition**
- Requires: Nothing (no sudo)
- Location: Uses current directory
- Available: Current user only
- Command: `olorin.sh` (or create alias)

### 4. Verify Installation

```bash
# Reload shell or open new terminal
source ~/.zshrc  # or ~/.bashrc

# Test command
olorin --version
olorin --help
```

## One-Line Install (From GitHub)

```bash
# Download and run installer directly
curl -fsSL https://raw.githubusercontent.com/your-org/bayit-plus/main/scripts/install.sh | bash
```

Or with wget:

```bash
wget -qO- https://raw.githubusercontent.com/your-org/bayit-plus/main/scripts/install.sh | bash
```

## Manual Installation

### System-Wide

```bash
# Navigate to scripts directory
cd /path/to/bayit-plus/scripts

# Create symlink
sudo ln -sf "$(pwd)/olorin.sh" /usr/local/bin/olorin

# Verify
olorin --version
```

### User-Only

```bash
# Navigate to scripts directory
cd /path/to/bayit-plus/scripts

# Create bin directory
mkdir -p ~/.local/bin

# Create symlink
ln -sf "$(pwd)/olorin.sh" ~/.local/bin/olorin

# Add to PATH (choose your shell)
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.zshrc  # or ~/.bashrc

# Reload shell
source ~/.zshrc  # or ~/.bashrc

# Verify
olorin --version
```

## After Installation

### Test the CLI

```bash
# Show help
olorin --help

# Check status
olorin status

# Show upload menu
olorin upload
```

### Set Up Environment (For Uploads)

```bash
# Copy environment template
cp scripts/backend/.env.upload.example scripts/backend/.env.upload

# Edit with your credentials
vim scripts/backend/.env.upload

# Add your credentials:
# - MONGODB_URL (MongoDB Atlas)
# - GOOGLE_APPLICATION_CREDENTIALS or gcloud auth
# - TMDB_API_KEY (optional)
# - GCS_BUCKET_NAME

# Source environment
source scripts/backend/.env.upload
```

### Upload Content

```bash
# Upload movies (dry run first)
olorin upload-movies --dry-run

# Upload movies from URL
olorin upload-movies --url https://example.com/movie.mp4

# Upload TV series
olorin upload-series --dry-run

# Upload series from URL
olorin upload-series --url https://example.com/episode.mkv
```

## Available Commands

```bash
# Platform Management
olorin start bayit          # Start all services
olorin stop                 # Stop services
olorin status               # Check status
olorin health               # Health check

# Development
olorin build [platform]     # Build platform
olorin test [platform]      # Run tests
olorin lint                 # Run linters

# Content Upload (New!)
olorin upload-movies [opts] # Upload movies
olorin upload-series [opts] # Upload TV series
olorin upload               # Show upload menu

# Utilities
olorin script [query]       # Find scripts
olorin --help               # Show help
olorin --version            # Show version
```

## For Other Team Members

Share this installation process:

### Step 1: Get Access to Repository

```bash
git clone <repository-url>
cd bayit-plus
```

### Step 2: Run Installer

```bash
cd scripts
./install.sh
```

### Step 3: Choose Installation Method

Follow the prompts to choose:
- System-wide (if you have sudo)
- User-only (if no sudo or prefer user installation)
- PATH addition (simplest, no symlink)

### Step 4: Set Up for Uploads (Optional)

If you need to upload content:

1. Get credentials:
   - MongoDB Atlas connection string
   - Google Cloud service account key OR gcloud auth
   - TMDB API key (optional but recommended)

2. Configure environment:
   ```bash
   cp scripts/backend/.env.upload.example scripts/backend/.env.upload
   vim scripts/backend/.env.upload
   # Add your credentials
   source scripts/backend/.env.upload
   ```

3. Test upload:
   ```bash
   olorin upload-movies --dry-run
   ```

## Troubleshooting

### Command not found

```bash
# Check if symlink exists
which olorin

# Check PATH
echo $PATH | tr ':' '\n' | grep -E 'local/bin|.local/bin'

# Reload shell
source ~/.zshrc  # or ~/.bashrc

# Or open new terminal
```

### Permission denied

```bash
# Make script executable
chmod +x /path/to/bayit-plus/scripts/olorin.sh

# Recreate symlink
sudo rm /usr/local/bin/olorin
sudo ln -sf /path/to/bayit-plus/scripts/olorin.sh /usr/local/bin/olorin
```

### Updates Not Applied

```bash
# Pull latest changes
cd /path/to/bayit-plus
git pull

# No reinstallation needed (symlink automatically points to updated script)
olorin --version
```

## Uninstall

### System-Wide Installation

```bash
sudo rm /usr/local/bin/olorin
```

### User-Only Installation

```bash
rm ~/.local/bin/olorin
# Also remove PATH line from ~/.zshrc or ~/.bashrc if added
```

### PATH Addition

```bash
# Remove PATH line from ~/.zshrc or ~/.bashrc
# That's it!
```

## Documentation

- **Full Setup Guide:** `OLORIN_CLI_SETUP.md`
- **Movie Upload Guide:** `backend/MOVIE_UPLOAD_GUIDE.md`
- **Series Upload Guide:** `backend/SERIES_UPLOAD_GUIDE.md`
- **Quick Reference:** `backend/QUICK_REFERENCE.md`
- **Scripts Overview:** `README.md`

## Support

For issues:
1. Check `olorin --help`
2. Verify installation: `which olorin`
3. Check PATH: `echo $PATH`
4. Try reinstalling: `./install.sh`

## Next Steps

After installation:

1. **Test basic commands:**
   ```bash
   olorin --help
   olorin status
   ```

2. **Try upload (dry run):**
   ```bash
   olorin upload-movies --dry-run
   olorin upload-series --dry-run
   ```

3. **Read documentation:**
   - Movie upload guide
   - Series upload guide
   - Quick reference

4. **Set up environment for real uploads:**
   - Configure `.env.upload`
   - Test with small batch
   - Upload content

---

**Version:** 1.0.0
**Last Updated:** 2026-01-25
