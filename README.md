# Omen

Real-time speech transcription, translation, and text-to-speech for iPhone, with ESP32 wearable display integration.

**Note:** Omen is an independent iOS application. It uses OpenAI and ElevenLabs API keys shared from the Bayit-Plus project for convenience and cost efficiency.

## Features

- 🎤 **Real-time Speech Transcription** - Captures speech and transcribes using OpenAI Realtime API
- 🌍 **Live Translation** - Simultaneously translates speech into multiple languages
- 🔊 **Text-to-Speech** - Speaks translations aloud using ElevenLabs AI voices
- 📱 **ESP32 Wearable** - Streams text to Bluetooth-connected wearable display
- ⚡ **Action Button Support** - Start sessions instantly on iPhone 15/16 Pro
- 🎨 **Audio Visualization** - Beautiful waveform display of voice input

## Requirements

### Hardware
- iPhone 15 Pro/Max or iPhone 16 Pro/Max (recommended for Action Button)
- iOS 17.0 or later
- Optional: ESP32 wearable with BLE UART service

### API Keys
- **OpenAI API Key** - Shared from Bayit-Plus project for convenience
- **ElevenLabs API Key** - Shared from Bayit-Plus project for convenience

> **Note**: Omen is a standalone project. API keys are borrowed from Bayit-Plus to avoid redundant API costs.

## Setup Instructions

### 1. Clone the Repository

```bash
cd ~/Documents
# The Omen folder should already exist with all source files
```

### 2. Configure API Keys

**API keys are already configured!** The `Config.xcconfig` file has been created with shared API keys:

- ✅ OpenAI API Key (shared from Bayit-Plus)
- ✅ ElevenLabs API Key (shared from Bayit-Plus)

> **Security Note**: `Config.xcconfig` contains actual API keys and is **gitignored**. It will not be committed to the repository.
>
> **Alternative**: You can use your own API keys by editing `Config.xcconfig` if preferred.

### 3. Create Xcode Project

1. Open Xcode
2. Create a new project:
   - Template: **iOS App**
   - Interface: **SwiftUI**
   - Language: **Swift**
   - Product Name: **Omen**
   - Bundle Identifier: `com.yourorg.omen` (use your organization identifier)

3. Add all source files to the project:
   - Drag the `Omen` folder into Xcode
   - Ensure all `.swift` files are added to the target

4. Add `Config.xcconfig` to the project:
   - Drag `Config.xcconfig` into Xcode
   - **Do NOT** add to target (it should remain external)

### 4. Configure Build Settings

1. Go to **Project Settings** → **Info** → **Configurations**
2. Set `Config.xcconfig` for both Debug and Release configurations

### 5. Add Capabilities

1. Go to **Signing & Capabilities**
2. Add **Background Modes**:
   - ✓ Audio, AirPlay, and Picture in Picture
   - ✓ Uses Bluetooth LE accessories
3. Add **App Intents** (for Action Button support)

### 6. Configure Info.plist

The `Info.plist` file is already configured with:
- Microphone permission description
- Bluetooth permission description
- Background modes
- API key references from Config.xcconfig

Verify these settings are present in your Xcode project's Info.plist.

### 7. Build and Run

1. Select your iPhone 15/16 Pro as the target device
2. Build the project (⌘+B)
3. Run on device (⌘+R)

## ESP32 Wearable Setup

### Required ESP32 Configuration

Your ESP32 must implement a BLE UART service with these UUIDs:

```c
Service UUID: 6E400001-B5A3-F393-E0A9-E50E24DCCA9E
TX Characteristic: 6E400002-B5A3-F393-E0A9-E50E24DCCA9E
Device Name: Omen_ESP32
```

### Example Arduino Code

```cpp
#include <BLEDevice.h>
#include <BLEUtils.h>
#include <BLEServer.h>

#define SERVICE_UUID "6E400001-B5A3-F393-E0A9-E50E24DCCA9E"
#define TX_UUID      "6E400002-B5A3-F393-E0A9-E50E24DCCA9E"

void setup() {
  BLEDevice::init("Omen_ESP32");
  BLEServer *pServer = BLEDevice::createServer();
  BLEService *pService = pServer->createService(SERVICE_UUID);

  BLECharacteristic *pTxCharacteristic = pService->createCharacteristic(
    TX_UUID,
    BLECharacteristic::PROPERTY_WRITE |
    BLECharacteristic::PROPERTY_WRITE_NR
  );

  pTxCharacteristic->setCallbacks(new MyCallbacks());
  pService->start();

  BLEAdvertising *pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(SERVICE_UUID);
  pAdvertising->start();
}
```

## Usage

### Starting a Session

**Method 1: Action Button (iPhone 15/16 Pro)**
1. Configure Action Button in iOS Settings → Action Button
2. Select "Omen" from the shortcuts list
3. Press Action Button to start session

**Method 2: Manual Start**
1. Open Omen app
2. Tap "Start Session" button
3. Grant microphone permission if prompted

### During a Session

- **Speak naturally** - Your speech will be transcribed in real-time
- **View original text** - Caption appears in the "Original" section
- **View translation** - Translation appears below in your target language
- **See wearable display** - Text is sent to ESP32 (if connected)
- **Hear translation** - TTS speaks aloud (if enabled in Settings)

### Settings

Access settings via the gear icon:

- **Target Language** - Choose translation language (Spanish, French, German, Japanese, Mandarin)
- **Text-to-Speech** - Toggle TTS on/off
- **Voice Selection** - Choose from 4 ElevenLabs voices
- **Bluetooth** - Scan for and connect to ESP32 wearable
- **Device Info** - View device compatibility and API status

## Supported Languages

- 🇪🇸 Spanish
- 🇫🇷 French
- 🇩🇪 German
- 🇯🇵 Japanese
- 🇨🇳 Mandarin Chinese

## TTS Voices

- **Rachel** - Natural, clear female voice
- **Adam** - Professional male voice
- **Bella** - Warm female voice
- **Arnold** - Deep male voice

## Architecture

```
Omen/
├── Models/              # Data models (BLE, Settings, Audio)
├── Services/            # Core services (Audio, OpenAI, ElevenLabs, BLE)
├── ViewModels/          # MVVM state management
├── Views/               # SwiftUI views
├── Intents/             # Action Button integration
└── Utilities/           # Helper classes (Debouncer, Extensions)
```

### Key Components

- **AudioEngine** - Captures 16kHz mono PCM audio from microphone
- **OpenAIService** - WebSocket connection to OpenAI Realtime API
- **ElevenLabsService** - Text-to-speech synthesis with streaming
- **BluetoothManager** - BLE communication with ESP32
- **OmenViewModel** - Coordinates all services with Combine pipelines

## Performance Optimization

- **100ms Debounce** - BLE writes are debounced to prevent buffer overflow
- **Streaming Audio** - Audio sent in 256ms chunks for low latency
- **Async/Await** - Modern concurrency for responsive UI
- **Memory Management** - Weak references prevent retain cycles

## Troubleshooting

### App Won't Build

- Verify `Config.xcconfig` exists and contains valid API keys
- Check that all files are added to the target
- Ensure iOS Deployment Target is set to 17.0+

### Microphone Not Working

- Go to Settings → Privacy → Microphone → Enable for Omen
- Restart the app after granting permission

### Bluetooth Won't Connect

- Ensure ESP32 is powered on and advertising
- Check that device name is exactly `Omen_ESP32`
- Verify Service UUID matches configuration
- Try "Scan for Wearable" in Settings

### TTS Not Speaking

- Enable TTS in Settings
- Check ElevenLabs API key is valid
- Verify audio output is not muted
- Check ElevenLabs quota hasn't been exceeded

### Action Button Not Working

- Only available on iPhone 15 Pro/Max and 16 Pro/Max
- Configure Action Button in iOS Settings
- Select "Start Omen Session" from shortcuts

## API Costs

### OpenAI Realtime API
- Pay-per-use pricing
- Monitor usage at [OpenAI Dashboard](https://platform.openai.com/usage)

### ElevenLabs API
- Character-based quotas
- Monitor usage at [ElevenLabs Dashboard](https://elevenlabs.io/app/usage)

## Known Limitations

- **iOS 17.0+** required for Action Button API
- **Pro models only** for Action Button hardware
- **Internet required** - Both APIs need network connection
- **Single wearable** - Only one ESP32 connection at a time
- **English input optimized** - Best results with clear English speech

## Future Enhancements

- [ ] Live Activity for Dynamic Island
- [ ] Session history and playback
- [ ] Multiple ESP32 device support
- [ ] Offline transcription using on-device Speech framework
- [ ] Custom wake word detection
- [ ] WidgetKit integration
- [ ] Cloud sync of settings

## Contributing

This project follows strict development standards:

- ✅ **No mocks or stubs** - All production code is fully implemented
- ✅ **No hardcoded values** - All configuration externalized
- ✅ **Complete implementations** - Every feature works end-to-end
- ✅ **Native APIs only** - 100% SwiftUI and iOS frameworks

## Project Information

**Project Type:** Independent iOS Application
**API Keys:** Shared from Bayit-Plus for cost efficiency (can be replaced with your own)
**Repository:** https://github.com/Olorin-ai-git/Omen
**Status:** Active Development

## License

Copyright © 2025. All rights reserved.

## Support

For issues, questions, or feature requests, please refer to the project documentation.

---

**Built with ❤️ using SwiftUI, OpenAI Realtime API, and ElevenLabs**
