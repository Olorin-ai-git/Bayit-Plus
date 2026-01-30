# App Store Connect Upload Guide for Bayit+

**Platform:** iOS & tvOS
**Updated:** 2026-01-27

---

## Prerequisites

- [ ] Apple Developer Account (active membership)
- [ ] App ID created in App Store Connect
- [ ] Certificates, Identifiers & Profiles configured
- [ ] Latest app build ready for submission
- [ ] All app metadata from `APP_STORE_METADATA.md`

---

## Step-by-Step Upload Instructions

### 1. Prepare Your Build

```bash
# In Xcode, ensure you have:
# 1. Selected the correct scheme (iOS or tvOS)
# 2. Set the version number in project settings
# 3. Incremented the build number
# 4. Connected to App Store Connect account
```

**Key Info to Verify:**
- **iOS Bundle ID:** `tv.bayit.ios` (or your configured ID)
- **tvOS Bundle ID:** `tv.bayit.tvos` (or your configured ID)
- **Marketing Version:** Should match your release version (e.g., 1.0.0)
- **Version Code (Build):** Must increment each submission

---

### 2. Archive & Upload in Xcode

#### For iOS:
```
1. Open Xcode
2. Select "Bayit+ iOS" scheme
3. Select "Any iOS Device (arm64)" as destination
4. Product → Archive
5. Wait for archive to complete
6. Organizer window opens → Select your archive
7. Click "Distribute App"
8. Select "App Store Connect" → Next
9. Select "Upload" → Next
10. Let Xcode strip symbols automatically
11. Click "Upload"
```

#### For tvOS:
```
1. Open Xcode
2. Select "Bayit+ tvOS" scheme
3. Select "Generic tvOS Device" as destination
4. Product → Archive
5. Wait for archive to complete
6. Organizer window opens → Select your archive
7. Click "Distribute App"
8. Select "App Store Connect" → Next
9. Select "Upload" → Next
10. Let Xcode strip symbols automatically
11. Click "Upload"
```

---

### 3. Configure App Store Connect (Web)

Once upload completes, go to **App Store Connect** (https://appstoreconnect.apple.com)

#### A. Version Information

1. Go to **Apps** → **Bayit+: Smart Israeli TV** → **Manage Versions**
2. Select your new build version
3. Fill in:
   - **Version Number:** `1.0.0` (or current version)
   - **Build:** Select from dropdown (your uploaded build)

---

#### B. App Information

1. Go to **Apps** → **App Information**
2. Update:
   - **App Name:** `Bayit+: The Smart Israeli TV Hub`
   - **Subtitle:** `Real-time AI translation & context for Israeli TV & Culture`
   - **Primary Language:** English

---

#### C. Pricing and Availability

1. Go to **Apps** → **Pricing and Availability**
2. Set:
   - **Price Tier:** Free (or Paid if applicable)
   - **Availability:** Select all territories
   - **App Type:** Apps

---

#### D. App Preview & Screenshots

1. Go to **Apps** → **App Preview and Screenshots**

2. **For iPhone:**
   - Resolution: 6.7" Display (2796 × 1290 px)
   - Upload 2-5 screenshots
   - Add descriptions explaining each feature

3. **For iPad:**
   - Resolution: 12.9" Display (2048 × 2732 px)
   - Upload 2-5 screenshots

4. **For Apple TV:**
   - Resolution: 1920 × 1080 px
   - Upload 2-5 screenshots

**Screenshot Order Recommendation:**
1. Home screen with AI features highlighted
2. Live TV with real-time dubbing
3. Smart Context Card example
4. VOD library
5. Visual Sync feature

---

#### E. App Description

1. Go to **Apps** → **Version** → **App Description**

2. Fill in these fields:

**Description:**
```
Bring Israel Home. In Your Language.

Bayit+ is the world's first AI-powered streaming platform dedicated to Israeli and Jewish content. Whether you are an expat missing home, a partner trying to connect with the culture, or a student learning Hebrew, Bayit+ makes Israeli television accessible, understandable, and smarter than ever before.

Why Bayit+? Watching Israeli TV abroad has always been a challenge—language barriers, missing cultural context, and fragmented apps. Bayit+ solves this by adding an "Intelligence Layer" to your viewing experience. We don't just stream content; we translate and explain it in real-time.

✨ AI-POWERED FEATURES

🎙️ Real-Time AI Dubbing
Watch live Israeli news and entertainment in your native language. Our advanced AI dubbing technology translates the broadcast instantly, allowing you to listen to Channel 12, 13, and 14 in English, French, or Spanish with near-zero latency.

🧠 Smart Context Cards
Never feel lost again. When a politician, historical event, or slang term is mentioned on screen, Bayit+ pushes a "Context Card" to your device explaining exactly who or what it is. Understand the nuance, not just the words.

👁️ Visual Sync Technology
Already watching on your big screen? Use our "Magic Sync" feature. Simply point your camera at your TV, and Bayit+ will identify the show and sync the translated audio to your personal device—perfect for mixed families where one person speaks Hebrew and the other doesn't.

📚 Interactive VOD Library
Explore a curated collection of Jewish and Israeli content enriched with AI deep-dives. Get AI-generated summaries, lesson plans for kids, and "Deep Dive" explainers that turn entertainment into a learning experience.

🏠 FOR THE WHOLE FAMILY

For Expats: Stay connected to the daily pulse of Israel without the distance.

For Partners: Watch Master Chef or the News together, finally understanding every joke and debate.

For Parents: Safe, curated content that helps pass heritage and language to the next generation.

Join the future of Jewish streaming. Download Bayit+ today and experience Israel like never before.
```

**Promotional Text** (170 characters max):
```
Experience Israel in your language. Real-time AI dubbing, context cards, and visual sync.
```

**Keywords** (comma-separated, 100 characters max):
```
Israeli TV, streaming, AI dubbing, translation, Hebrew learning, Jewish culture
```

---

#### F. General App Information

1. Go to **Apps** → **General App Information**

2. Configure:
   - **Category:** Entertainment
   - **Content Rights:** Confirm appropriate rights
   - **Age Rating:** 12+ (or based on content)

---

#### G. Ratings Questionnaire

1. Go to **Apps** → **App Information** → **Age Rating**

2. Complete the **App Store Age Ratings Questionnaire**:
   - Frequent/Intense Violence: **NO**
   - Frequent/Intense Sexual Content: **NO**
   - Frequent/Intense Profanity: **NO**
   - Alcohol, Tobacco, Drug Use: **NO**
   - Gambling Simulation: **NO**
   - Medical/Treatment Information: **NO**
   - Realistic Violence: **NO**

3. Click **Save**

---

#### H. Privacy

1. Go to **Apps** → **Privacy**

2. Set **Privacy Policy URL:**
```
https://bayit.tv/policy
```

3. Configure **Privacy - Data Collection and Storage:**
   - Select what data you collect (per your actual privacy policy)
   - Examples: Analytics, Location data, Camera access
   - Mark data as: Required / Optional
   - Indicate: Used for tracking or not

---

#### I. Build Information

1. Go to **Apps** → **Version** → **Build**

2. Click **+ Select a Build to Test With**

3. Select your uploaded build from the list

4. Go through the **Missing Compliance** checklist:
   - NSLocalNetworkUsageDescription: ✓ (in Info.plist)
   - NSMicrophoneUsageDescription: ✓ (in Info.plist)
   - NSLocationWhenInUseUsageDescription: ✓ (in Info.plist)
   - NSSpeechRecognitionUsageDescription: ✓ (in Info.plist)

---

### 4. Submit for Review

1. After all sections are complete, you'll see a **"Submit for Review"** button

2. Click **"Submit for Review"**

3. Answer submission questions:
   - **Sign in required:** NO (unless you require login)
   - **Test account required:** NO (unless needed for testing)
   - **Advertising:** NO (or YES if you have ads)
   - **Geolocation:** YES (location-based content)
   - **Notes for reviewers:**
   ```
   Bayit+ is an AI-powered streaming platform for Israeli content.
   - Real-time AI dubbing for select live broadcasts
   - Context cards for cultural/political references
   - Visual Sync requires camera permission for feature identification
   - No personal data or conversations are recorded
   - Privacy policy: https://bayit.tv/policy
   ```

4. Click **"Submit"**

---

### 5. Monitor Review Status

1. Go to **Apps** → **Activity**
2. Monitor the status:
   - **Waiting for Review:** App in queue
   - **In Review:** Apple is reviewing
   - **Ready for Sale:** Approved! ✓
   - **Rejected:** Requires changes

**Expected Timeline:**
- iOS: 24-48 hours
- tvOS: 24-48 hours (may take longer)

---

## Troubleshooting

### Build Won't Upload
**Error:** "Build is not available for testing"
**Solution:**
- Wait 5-10 minutes after upload completes
- Build must be fully processed before it appears in App Store Connect

### Signing Certificate Issues
**Error:** "Certificate invalid" or "Provisioning profile error"
**Solution:**
```bash
# In Xcode:
1. Preferences → Accounts
2. Select your Apple ID
3. Click "Manage Certificates"
4. Create a new "Apple Distribution" certificate if missing
5. Download updated provisioning profiles
```

### AppKit Framework Error
**Error:** "Unsupported architectures in the binary"
**Solution:**
- Ensure you selected "Any iOS Device (arm64)" not simulator
- Clean build folder: Cmd + Shift + K
- Rebuild: Cmd + B

### Privacy Violations
**Error:** "Missing privacy descriptions"
**Solution:**
- All permission descriptions must be in Info.plist (already configured)
- Check that NSLocationWhenInUseUsageDescription is present
- Check that NSMicrophoneUsageDescription is present
- Check that NSCameraUsageDescription is present (if using Visual Sync)

---

## Post-Approval

1. **Set Release Date:**
   - Default: "Release this version immediately when it's ready"
   - Or schedule for specific date

2. **Monitor:**
   - Check App Store page appears correctly
   - Verify all screenshots display properly
   - Test download and installation on device

3. **Marketing:**
   - Share link: https://apps.apple.com/app/bayit-plus/[YOUR_APP_ID]
   - Update social media
   - Notify users of availability

---

## Compliance Notes

**Apple Requirements Met:**
- ✓ All privacy permissions documented in Info.plist
- ✓ Privacy Policy URL provided
- ✓ No hardcoded credentials in app
- ✓ Compliant with App Store Guidelines
- ✓ Accessibility features implemented (where applicable)

**Permissions Requested:**
- **Camera:** Visual Sync feature (not used without user consent)
- **Microphone:** Voice commands (not used without user consent)
- **Location:** Local content recommendations (with privacy control)
- **Speech Recognition:** Voice commands

---

## Localization (Future Updates)

When adding language support, you'll need to:

1. Add translated screenshots for each language:
   - German (Deutsch)
   - French (Français)
   - Hebrew (עברית)
   - Spanish (Español)

2. Translate app metadata:
   - Description
   - Keywords
   - Promotional text

---

## Version Update Process

For future updates, repeat:
1. Increment build number in Xcode
2. Archive and upload
3. Update screenshots (if UI changed)
4. Update description (if features changed)
5. Add release notes
6. Submit for review

---

**Questions?** Contact support@bayit.tv or check https://bayit.tv/support
