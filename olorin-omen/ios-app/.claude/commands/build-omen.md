# Build Omen Command

Build and test the Omen iOS app with comprehensive quality checks.

## Usage

```bash
/build-omen [--test] [--clean]
```

## Description

Builds the Omen iOS application, runs unit tests, and performs code quality checks. Ensures the app is ready for deployment or device testing.

## Arguments

- **--test** - Run unit tests after build (default: true)
- **--clean** - Clean build folder before building

## Examples

### Build with Tests
```bash
/build-omen
```

### Clean Build
```bash
/build-omen --clean
```

### Build Only (Skip Tests)
```bash
/build-omen --no-test
```

## Pre-Build Checklist

1. ✅ Config.xcconfig exists with valid API keys
2. ✅ All Swift files compile without errors
3. ✅ Info.plist permissions configured
4. ✅ Capabilities enabled (Background Modes, App Intents)
5. ✅ Deployment target set to iOS 17.0+
6. ✅ Code signing configured

## Build Steps

### 1. Verify Configuration

```bash
# Check Config.xcconfig exists
if [ ! -f "Config.xcconfig" ]; then
    echo "Error: Config.xcconfig not found"
    echo "Create Config.xcconfig with API keys:"
    echo "OPENAI_API_KEY = your-key-here"
    echo "ELEVENLABS_API_KEY = your-key-here"
    exit 1
fi

# Check API keys are set
if ! grep -q "OPENAI_API_KEY" Config.xcconfig; then
    echo "Error: OPENAI_API_KEY not found in Config.xcconfig"
    exit 1
fi
```

### 2. Clean Build (Optional)

```bash
# Clean build folder
xcodebuild clean \
    -project Omen.xcodeproj \
    -scheme Omen \
    -configuration Debug
```

### 3. Build Project

```bash
# Build for device
xcodebuild build \
    -project Omen.xcodeproj \
    -scheme Omen \
    -configuration Debug \
    -destination 'generic/platform=iOS' \
    CODE_SIGN_IDENTITY="" \
    CODE_SIGNING_REQUIRED=NO \
    CODE_SIGNING_ALLOWED=NO

# Or build for simulator
xcodebuild build \
    -project Omen.xcodeproj \
    -scheme Omen \
    -configuration Debug \
    -destination 'platform=iOS Simulator,name=iPhone 15 Pro'
```

### 4. Run Unit Tests

```bash
# Run tests on simulator
xcodebuild test \
    -project Omen.xcodeproj \
    -scheme Omen \
    -destination 'platform=iOS Simulator,name=iPhone 15 Pro' \
    -enableCodeCoverage YES

# Parse results
xcrun xcresulttool get --format json --path TestResults.xcresult
```

### 5. Code Quality Checks

```bash
# SwiftLint (if configured)
if command -v swiftlint &> /dev/null; then
    swiftlint lint --quiet
fi

# SwiftFormat (if configured)
if command -v swiftformat &> /dev/null; then
    swiftformat --lint .
fi

# Check for TODOs/FIXMEs in production code
echo "Scanning for TODOs and FIXMEs..."
grep -r "TODO\|FIXME" Omen/ --exclude-dir=Tests || echo "No TODOs found"
```

### 6. Verify Build Artifacts

```bash
# Check that .app was created
BUILD_DIR=$(xcodebuild -project Omen.xcodeproj -showBuildSettings | grep " BUILD_DIR " | awk '{print $3}')
APP_PATH="$BUILD_DIR/Debug-iphonesimulator/Omen.app"

if [ -d "$APP_PATH" ]; then
    echo "✓ Build successful: $APP_PATH"
    ls -lh "$APP_PATH"
else
    echo "✗ Build failed: .app not found"
    exit 1
fi
```

## Build Configuration

### Debug Configuration

```
Build Configuration: Debug
Optimization Level: None [-Onone]
Swift Compiler - Code Generation:
  - Debug Information Format: DWARF with dSYM File
  - Compilation Mode: Incremental
  - Active Compilation Conditions: DEBUG
```

### Release Configuration

```
Build Configuration: Release
Optimization Level: Fast, Whole Module Optimization [-O -whole-module-optimization]
Swift Compiler - Code Generation:
  - Debug Information Format: DWARF with dSYM File
  - Compilation Mode: Whole Module
  - Active Compilation Conditions: (empty)
```

## Testing Requirements

### Unit Tests
- Minimum 80% code coverage
- Test all ViewModels
- Test service layer (with mocked external APIs)
- Test utilities and helpers

### Integration Tests
- Test audio pipeline
- Test WebSocket connectivity (with test server)
- Test BLE communication (with simulated peripheral)
- Test TTS playback

### UI Tests (Optional)
- Test main user flows
- Test settings screen
- Test permission prompts

## Common Build Errors

### Error: API Key Not Found

```
Solution:
1. Create Config.xcconfig
2. Add API keys:
   OPENAI_API_KEY = sk-proj-...
   ELEVENLABS_API_KEY = ...
3. Add Config.xcconfig to project (don't add to target)
4. Set configurations to use Config.xcconfig
```

### Error: Code Signing Failed

```
Solution:
1. Go to Signing & Capabilities
2. Enable "Automatically manage signing"
3. Select your development team
4. Or disable signing for build-only:
   CODE_SIGNING_REQUIRED=NO
```

### Error: Missing Capabilities

```
Solution:
1. Go to Signing & Capabilities
2. Add Background Modes capability
3. Enable: Audio, Bluetooth LE accessories
4. Add App Intents capability
```

### Error: Swift Compile Error

```
Solution:
1. Check for syntax errors in Swift files
2. Ensure all imports are correct
3. Clean build folder (⌘+Shift+K)
4. Rebuild (⌘+B)
```

## Output

```
🔨 Building Omen...
   Platform: iOS 17.0+
   Configuration: Debug

✓ Configuration verified
   - Config.xcconfig: Found
   - API keys: Configured

🧹 Cleaning build folder...
✓ Clean completed

📦 Building project...
   Compiling Swift files...
   - OmenApp.swift
   - ContentView.swift
   - OmenViewModel.swift
   - AudioEngine.swift
   - OpenAIService.swift
   - ElevenLabsService.swift
   - BluetoothManager.swift
   (... 15 files total)

✓ Build successful
   Build time: 12.3s
   Output: Debug-iphonesimulator/Omen.app

🧪 Running tests...
   Test Suite: OmenTests
   - testAudioEngineConfiguration: ✓
   - testOpenAIServiceConnection: ✓
   - testElevenLabsSynthesis: ✓
   - testBluetoothScanning: ✓
   - testViewModelState: ✓

✓ All tests passed (5/5)
   Code coverage: 85%

📊 Code quality checks...
   SwiftLint: ✓ No issues found
   SwiftFormat: ✓ All files formatted correctly
   TODOs: 0 found in production code

✅ Build completed successfully!
   - Build: ✓ Success
   - Tests: ✓ 5/5 passed
   - Coverage: ✓ 85%
   - Quality: ✓ All checks passed

Ready to run on device or deploy to TestFlight.
```

## Prerequisites

- Xcode 15.0+
- iOS SDK 17.0+
- Valid Apple Developer account (for device testing)
- Config.xcconfig with API keys

## Related Files

- `Omen.xcodeproj` - Xcode project file
- `Config.xcconfig` - API keys configuration
- `Info.plist` - App configuration
- `OmenTests/` - Unit test files

## See Also

- `/test-audio` - Test audio pipeline specifically
- `/deploy-omen` - Deploy to TestFlight/App Store
- Global commands: `/test`, `/build`
