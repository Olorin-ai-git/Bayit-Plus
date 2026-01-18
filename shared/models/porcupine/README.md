# Porcupine Wake Word Models

This directory contains custom wake word models for Picovoice Porcupine.

## Wake Word: "Hey Buyit"

The wake word "Hey Buyit" is phonetically identical to Hebrew "הי בית" (Hi Bayit / Hi Home).
This allows a single English-trained model to work for both English and Hebrew speakers.

## Training Custom Wake Word

1. Login to [Picovoice Console](https://console.picovoice.ai/) with:
   - Email: gil.klainert@gmail.com
   - Auth: Google OAuth

2. Navigate to Porcupine > Train Custom Wake Word

3. Create wake word with phrase: **"Hey Buyit"**
   - Phonetic guide: "hey buy-it"
   - This sounds like Hebrew "הי בית" (hi ba-yit)

4. Select platforms:
   - Web (WASM): Download as `hey_buyit_wasm.ppn`
   - iOS: Download as `hey_buyit_ios.ppn`

5. Place downloaded files in this directory:
   ```
   shared/models/porcupine/
   ├── hey_buyit_wasm.ppn    # Web/WASM model
   ├── hey_buyit_ios.ppn     # iOS model
   └── README.md             # This file
   ```

## Fallback Behavior

If custom models are not found, the system will:
1. Fall back to a built-in Porcupine keyword for testing
2. Eventually fall back to VAD-only mode (no wake word)

## Free Tier Limitations

Picovoice free tier includes:
- 3 active devices per month
- Personal/non-commercial use only
- No Hebrew language support (we use phonetic English)
- Community support only

## Model Files

| File | Platform | Status |
|------|----------|--------|
| `hey_buyit_wasm.ppn` | Web/WASM | **Download Web version from Picovoice Console** |
| `hey_buyit_ios.ppn` | iOS | Pending |
| `hey_buyit_mac.ppn` | macOS | Available (not used for web) |

**IMPORTANT**: The Mac `.ppn` file cannot be used for web. Each platform requires its own model export:
- **Web**: Select "Web" platform in Picovoice Console
- **iOS**: Select "iOS" platform
- **macOS**: Select "macOS" platform

## Testing

To test wake word detection:
1. Start the web app: `cd web && npm start`
2. Allow microphone access
3. Say "Hey Buyit" clearly
4. Check console for: `[WakeWordListening] Wake word detected!`
