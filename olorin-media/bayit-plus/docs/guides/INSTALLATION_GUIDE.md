# Installation and Setup Guide

## Table of Contents

1. [System Requirements](#system-requirements)
2. [Developer Environment Setup](#developer-environment-setup)
3. [Backend Setup](#backend-setup)
4. [Mobile App Setup](#mobile-app-setup)
5. [Configuration](#configuration)
6. [Running the Application](#running-the-application)
7. [Troubleshooting](#troubleshooting)
8. [IDE Setup](#ide-setup)

---

## System Requirements

### Minimum Requirements

- **Operating System**: macOS 12.0 or later (for iOS development)
- **RAM**: 8GB (16GB recommended)
- **Disk Space**: 50GB available
- **Network**: Stable internet connection

### Development Tools

| Tool | Version | Purpose |
|------|---------|---------|
| Xcode | 14.0+ | iOS development and compilation |
| Node.js | 18.0+ | JavaScript runtime and npm |
| Python | 3.11+ | Backend server runtime |
| Git | 2.0+ | Version control |
| Homebrew | Latest | Package management |
| CocoaPods | 1.11+ | iOS dependency management |

### iOS Requirements (for device testing)

- **iOS Version**: iOS 15.0 or later
- **Devices**: iPhone SE or newer
- **Developer Account**: Apple Developer Program membership (for device testing)
- **Storage**: 512MB minimum available space on device

---

## Developer Environment Setup

### Step 1: Install Xcode and Command Line Tools

```bash
# Install Xcode from App Store (or use command line tools)
xcode-select --install

# Verify installation
xcode-select -p
# Expected output: /Applications/Xcode.app/Contents/Developer
```

### Step 2: Install Homebrew

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Verify installation
brew --version
```

### Step 3: Install Node.js and npm

```bash
# Using Homebrew
brew install node

# Verify installation
node --version  # v18.0.0 or later
npm --version   # 8.0.0 or later

# Update npm to latest
npm install -g npm@latest
```

### Step 4: Install Python 3.11

```bash
# Using Homebrew
brew install python@3.11

# Verify installation
python3 --version  # Should show 3.11.x

# Create alias for convenience (optional)
echo 'alias python=python3.11' >> ~/.zshrc
source ~/.zshrc
```

### Step 5: Install Poetry (Python package manager)

```bash
# Install Poetry using pip
python3.11 -m pip install poetry

# Verify installation
poetry --version  # Should show 1.5.0 or later

# Enable tab completion (optional)
poetry completions zsh > ~/.oh-my-zsh/completions/_poetry
```

### Step 6: Install CocoaPods

```bash
# Using Homebrew
brew install cocoapods

# Verify installation
pod --version  # 1.11.0 or later

# Setup CocoaPods repository (if not already done)
pod setup
```

---

## Backend Setup

### Step 1: Clone and Navigate to Backend

```bash
# From project root
cd backend

# Verify you're in the right directory
pwd  # Should end with /backend
```

### Step 2: Install Python Dependencies

```bash
# Install dependencies using Poetry
poetry install

# This will:
# - Create a virtual environment
# - Install all dependencies from pyproject.toml
# - Lock dependencies to poetry.lock for reproducibility

# Verify installation
poetry run python --version  # Should show 3.11.x
poetry show  # List all installed packages
```

### Step 3: Configure Environment Variables

```bash
# Create .env file from template
cp .env.example .env

# Edit .env with your configuration
nano .env  # or use your preferred editor
```

**Required Environment Variables** (see `.env.example` for all options):

```env
# Application
ENVIRONMENT=development
LOG_LEVEL=INFO

# Database
MONGODB_URI=mongodb://localhost:27017/bayitplus
MONGODB_DB_NAME=bayitplus

# API Configuration
API_BASE_URL=http://localhost:8000
API_PORT=8000
CORS_ORIGINS=["http://localhost:5173","http://localhost:8081"]

# Third-Party Services
ELEVENLABS_API_KEY=your_key_here
ELEVENLABS_API_BASE_URL=https://api.elevenlabs.io/v1
SENTRY_DSN=your_sentry_url_here

# Security
SECRET_KEY=your_secret_key_here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Voice Configuration
PICOVOICE_ACCESS_KEY=your_picovoice_key_here
VOICE_TIMEOUT_SECONDS=30
```

### Step 4: Setup Database

```bash
# MongoDB must be running (either local or Atlas)
# For local MongoDB:
brew services start mongodb-community

# For MongoDB Atlas:
# 1. Create account at mongodb.com/atlas
# 2. Create cluster and get connection string
# 3. Update MONGODB_URI in .env

# Verify database connection
poetry run python -c "
from app.core.config import settings
from motor.motor_asyncio import AsyncClient
import asyncio

async def test_db():
    client = AsyncClient(settings.mongodb_uri)
    db = client[settings.mongodb_db_name]
    await db.command('ping')
    print('✓ Database connection successful')

asyncio.run(test_db())
"
```

### Step 5: Initialize Database (Optional)

```bash
# If database initialization scripts are available:
poetry run python scripts/init_db.py

# Or apply any existing migrations:
poetry run python scripts/migrate.py
```

---

## Mobile App Setup

### Step 1: Clone and Navigate to Mobile App

```bash
# From project root
cd mobile-app

# Verify you're in the right directory
pwd  # Should end with /mobile-app
```

### Step 2: Install Node Dependencies

```bash
# Install npm packages
npm install

# Verify key packages installed
npm list react react-native @react-navigation/native

# This will create node_modules/ and package-lock.json
```

### Step 3: Install iOS Dependencies (CocoaPods)

```bash
# Navigate to iOS directory
cd ios

# Install CocoaPods dependencies
pod install

# This creates Pods/ directory and updates workspace

# Return to mobile-app root
cd ..
```

### Step 4: Configure Environment Variables

```bash
# Create .env file from template
cp .env.example .env

# Edit .env with your configuration
nano .env
```

**Required Environment Variables**:

```env
# API Configuration
API_BASE_URL=http://localhost:8000
API_TIMEOUT_MS=30000

# Sentry Configuration
SENTRY_DSN=your_sentry_url_here
SENTRY_ENVIRONMENT=development
SENTRY_RELEASE=1.0.0

# Voice Configuration
PICOVOICE_ACCESS_KEY=your_picovoice_key_here
ELEVENLABS_API_KEY=your_elevenlabs_key_here

# Feature Flags
ENABLE_VOICE_FEATURES=true
ENABLE_ANALYTICS=true
ENABLE_CRASH_REPORTING=true

# Localization
DEFAULT_LANGUAGE=en
SUPPORTED_LANGUAGES=en,he,es
```

### Step 5: iOS-Specific Configuration

```bash
# Navigate to iOS directory
cd ios

# Create Xcode user-specific file (gitignored)
# This ensures personalized settings don't affect git
cat > BayitPlus.xcworkspace/xcuserdata/$(whoami).xcuserdatad/WorkspaceSettings.xcsettings << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>BuildSystemType</key>
    <string>Latest</string>
    <key>IDEWorkspaceSharedSettings_AutocreateContextsIfNeeded</key>
    <true/>
</dict>
</plist>
EOF

# Return to mobile-app root
cd ..
```

### Step 6: Verify Installation

```bash
# Check React Native CLI
npx react-native --version

# Verify Xcode command line tools
xcode-select -p  # Should show /Applications/Xcode.app/Contents/Developer

# Check CocoaPods installation
pod --version

# Verify all dependencies
npm list --depth=0
```

---

## Configuration

### Environment-Specific Configuration

#### Development Configuration

```env
# .env (development)
ENVIRONMENT=development
LOG_LEVEL=DEBUG
API_BASE_URL=http://localhost:8000
ENABLE_DEBUGGING=true
ENABLE_ANALYTICS=false
```

#### Production Configuration

```env
# .env.production
ENVIRONMENT=production
LOG_LEVEL=ERROR
API_BASE_URL=https://api.bayitplus.com
ENABLE_DEBUGGING=false
ENABLE_ANALYTICS=true
SENTRY_ENVIRONMENT=production
```

### Sensitive Configuration

**Never commit the following files to git:**
- `.env` (use `.env.example` as template)
- `Keychain files`
- `Credentials or tokens`
- `AWS/API keys`

### Verify Configuration

```bash
# Backend: Check configuration loads correctly
cd backend
poetry run python -c "
from app.core.config import settings
print(f'Environment: {settings.environment}')
print(f'Database: {settings.mongodb_uri}')
print(f'API Port: {settings.api_port}')
print('✓ Configuration loaded successfully')
"

# Mobile: Check configuration in app
# Settings → About → Configuration (in debug menu)
```

---

## Running the Application

### Backend Server

```bash
# Navigate to backend directory
cd backend

# Start development server
poetry run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Output should show:
# INFO:     Uvicorn running on http://0.0.0.0:8000
# INFO:     Application startup complete
```

**Common Flags:**
- `--reload`: Auto-reload on code changes (development only)
- `--host 0.0.0.0`: Listen on all interfaces (required for device testing)
- `--port 8000`: Server port
- `--log-level debug`: Increase logging verbosity

**Verify Backend:**
```bash
# In another terminal
curl http://localhost:8000/api/health
# Expected: {"status": "healthy"}
```

### iOS Simulator

```bash
# Navigate to mobile-app directory
cd mobile-app

# Start Metro bundler (in first terminal)
npm start

# In another terminal: build and run on simulator
npx react-native run-ios --simulator "iPhone 15"

# Or open in Xcode directly
open ios/BayitPlus.xcworkspace
# Then: Select iPhone simulator and press ▶ (Run)
```

**Simulator Options:**
- `--simulator "iPhone SE (3rd generation)"`
- `--simulator "iPhone 15 Pro"`
- `--simulator "iPhone 15 Pro Max"`

### Physical Device

```bash
# 1. Connect iPhone via USB
# 2. Trust the certificate on device
# 3. Navigate to mobile-app directory
cd mobile-app

# 4. Start Metro bundler (Terminal 1)
npm start

# 5. Build and install on device (Terminal 2)
npx react-native run-ios --device

# 6. Alternative: Build in Xcode
open ios/BayitPlus.xcworkspace
# Then: Select connected device in Xcode and press ▶
```

**Device Prerequisites:**
- iOS 15.0 or later
- Developer Mode enabled (Settings → Developer)
- USB cable connected
- Trust certificate prompt accepted

---

## Troubleshooting

### Common Issues and Solutions

#### Issue 1: Pod Install Fails

```bash
# Error: "Unable to find a specification for 'SomeLibrary'"

# Solution:
pod repo update  # Update CocoaPods repository
rm -rf ios/Pods ios/Podfile.lock  # Remove cached pods
cd ios && pod install && cd ..  # Reinstall
```

#### Issue 2: Metro Bundler Crashes

```bash
# Error: "Error: getuid is not allowed to be called from the main thread"

# Solution:
npm start -- --reset-cache  # Reset Metro cache
# Or: Kill any existing bundler processes
lsof -i :8081
kill -9 <PID>
npm start
```

#### Issue 3: Build Fails with Signing Errors

```bash
# Error: "Code Sign error ... signing for 'BayitPlus'"

# Solution in Xcode:
# 1. Open BayitPlus.xcworkspace
# 2. Select "BayitPlus" project
# 3. Go to Signing & Capabilities
# 4. Select Team: Your Development Team
# 5. Check "Automatically manage signing"
# 6. Clean build folder: Cmd+Shift+K
# 7. Build again: Cmd+B
```

#### Issue 4: Database Connection Fails

```bash
# Error: "connect ECONNREFUSED 127.0.0.1:27017"

# Solution:
# 1. Check MongoDB is running:
brew services list | grep mongodb

# 2. Start MongoDB if not running:
brew services start mongodb-community

# 3. Or use MongoDB Atlas:
# - Create account at mongodb.com/atlas
# - Update MONGODB_URI in .env
```

#### Issue 5: Environment Variables Not Loading

```bash
# Error: "ELEVENLABS_API_KEY is not set"

# Solution:
# 1. Verify .env file exists
ls -la .env

# 2. Check .env file is not gitignored (it shouldn't be)
git check-ignore .env

# 3. Reload environment:
source .env  # Shell-based (backend)
# Or restart app (mobile)

# 4. Verify variable is set:
echo $API_BASE_URL  # Should print value, not empty
```

#### Issue 6: Port Already in Use

```bash
# Error: "Address already in use: 8000"

# Solution:
# 1. Find process using port 8000:
lsof -i :8000

# 2. Kill the process:
kill -9 <PID>

# 3. Verify port is free:
lsof -i :8000  # Should show nothing

# 4. Start server again:
poetry run uvicorn app.main:app --reload
```

#### Issue 7: iOS Deployment Target Mismatch

```bash
# Error: "Minimum deployment target is iOS 15.0"

# Solution in Xcode:
# 1. Select BayitPlus project
# 2. Go to Build Settings
# 3. Search for "Minimum Deployment Target"
# 4. Set to iOS 15.0 for both project and all targets
```

### Getting Help

If you encounter issues not listed above:

1. **Check logs**:
   ```bash
   # Backend logs
   tail -f ~/.local/share/poetry/logs/poetry.log

   # Xcode logs
   ~/Library/Logs/DiagnosticsKit/
   ```

2. **Clean and rebuild**:
   ```bash
   # Backend
   poetry env remove <env-name>
   poetry install

   # Mobile
   rm -rf node_modules ios/Pods
   npm install
   cd ios && pod install && cd ..
   ```

3. **Check dependencies**:
   ```bash
   # Backend
   poetry show --outdated

   # Mobile
   npm outdated
   ```

4. **Reset development environment**:
   ```bash
   # Xcode cache
   rm -rf ~/Library/Developer/Xcode/DerivedData/*

   # CocoaPods
   rm -rf ios/Pods ios/Podfile.lock
   ```

---

## IDE Setup

### Visual Studio Code (Backend)

**Extensions:**
```bash
# Install recommended extensions
code --install-extension ms-python.python
code --install-extension charliermarsh.ruff
code --install-extension ms-python.vscode-pylance
code --install-extension eamodio.gitlens
```

**Settings** (`.vscode/settings.json`):
```json
{
  "python.defaultInterpreterPath": "${workspaceFolder}/venv/bin/python",
  "python.linting.enabled": true,
  "python.linting.pylintEnabled": true,
  "[python]": {
    "editor.formatOnSave": true,
    "editor.defaultFormatter": "charliermarsh.ruff"
  },
  "files.exclude": {
    "**/__pycache__": true,
    "**/.pytest_cache": true
  }
}
```

### Xcode (Mobile App)

**Key Settings:**
1. **Xcode Preferences** (Cmd+,):
   - Locations → Command Line Tools: Select Xcode version
   - Text Editing → Display: Enable line numbers and column guides
   - Navigation → Navigation Style: Open in Editor

2. **Scheme Settings**:
   - Select "BayitPlus" scheme
   - Edit Scheme (Cmd+Shift+<)
   - Pre-actions tab: Set environment variables or run build scripts

3. **Build Settings**:
   - Set to "All" and "Combined" for visibility
   - Verify iOS Deployment Target = 15.0
   - Code Sign Style = Automatic (for development)

**Useful Keyboard Shortcuts:**
- `Cmd+B`: Build
- `Cmd+R`: Run
- `Cmd+U`: Run tests
- `Cmd+Shift+K`: Clean build folder
- `Cmd+Shift+Y`: Show/hide debug area
- `Cmd+7`: Show navigator
- `Cmd+8`: Show debug navigator

---

## Next Steps

1. **Configure API Server**: Update `API_BASE_URL` in `.env` to point to your backend
2. **Test Backend**: Run `poetry run pytest` to verify backend tests pass
3. **Test Mobile**: Build and run on simulator or device
4. **Check Voice Features**: Configure Picovoice and ElevenLabs API keys
5. **Enable Analytics**: Setup Sentry DSN for error tracking
6. **Review Documentation**: See [docs/](../docs/) folder for additional guides

---

## Support

For additional help:
- Backend: See `backend/README.md`
- Mobile: See `mobile-app/README.md`
- Issues: Check project issue tracker
- Contact: support@bayitplus.com
