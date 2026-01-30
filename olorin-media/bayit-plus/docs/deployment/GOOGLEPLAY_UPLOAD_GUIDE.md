# Google Play Console Upload Guide for Bayit+

**Platform:** Android
**Updated:** 2026-01-27

---

## Prerequisites

- [ ] Google Play Developer Account (one-time fee: $25)
- [ ] App created in Google Play Console
- [ ] Signed APK or AAB (Android App Bundle) ready
- [ ] All app metadata from `APP_STORE_METADATA.md`
- [ ] Keystore file with signing certificate backed up

---

## Step-by-Step Upload Instructions

### 1. Generate Signed APK/AAB

#### Option A: Using Android Studio (Recommended - AAB format)

```
1. In Android Studio, open your project
2. Select Build → Generate Signed Bundle/APK
3. Select "Android App Bundle" → Next
4. Select "Create new..." to create a keystore if needed
5. Fill in:
   - Key store path: [Choose a secure location]
   - Key store password: [Create strong password]
   - Key alias: bayit-plus-release
   - Key password: [Same or different]
   - Validity: 50 years (or higher)
6. Click "Next"
7. Select "release" build variant
8. Check "V2 (Full APK Signature)" → Finish
9. Wait for signing process (AAB file created in app/release/)
```

#### Option B: Using Command Line

```bash
# Build signed APK
./gradlew assembleRelease -Pandroid.injected.signing.store.file=keystore.jks \
  -Pandroid.injected.signing.store.password=YOUR_KEYSTORE_PASSWORD \
  -Pandroid.injected.signing.key.alias=bayit-plus-release \
  -Pandroid.injected.signing.key.password=YOUR_KEY_PASSWORD

# Or build AAB
./gradlew bundleRelease -Pandroid.injected.signing.store.file=keystore.jks \
  -Pandroid.injected.signing.store.password=YOUR_KEYSTORE_PASSWORD \
  -Pandroid.injected.signing.key.alias=bayit-plus-release \
  -Pandroid.injected.signing.key.password=YOUR_KEY_PASSWORD
```

**Important:** Back up your keystore file! You'll need it for future updates.

```bash
# Backup keystore
cp keystore.jks ~/Backup/bayit-plus-keystore.jks
# Backup the password in secure password manager
```

---

### 2. Verify Signed Build

```bash
# Verify APK signature
jarsigner -verify -verbose -certs app-release.aab

# Check APK contents
aapt dump badging app-release.aab
```

---

### 3. Configure Google Play Console

Go to **Google Play Console** (https://play.google.com/console)

#### A. Create/Configure Your App

1. Click **"Create app"** (if new)
2. Enter:
   - **App name:** `Bayit+: The Smart Israeli TV Hub`
   - **Default language:** English
   - **App category:** Entertainment → Streaming & Media Players
   - **App type:** Application
   - **Free/Paid:** Free

3. Click **"Create app"**

---

#### B. Store Listing

1. Go to **Store listing** section

2. Fill in **Title** (50 characters max):
```
Bayit+: The Smart Israeli TV Hub
```

3. Fill in **Short description** (80 characters max):
```
Real-time AI translation & context for Israeli TV & Culture
```

4. Fill in **Full description** (4000 characters max):
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

TECHNICAL REQUIREMENTS
- Requires an active internet connection
- Visual Sync features require camera access (privacy protected)
- AI Dubbing features are available on select live broadcasts

Join the future of Jewish streaming. Download Bayit+ today and experience Israel like never before.
```

5. Upload **Feature Graphic** (1024 × 500 px):
   - Should show: AI features, cultural connection
   - File format: PNG or JPEG

6. Upload **App Icon** (512 × 512 px):
   - Rounded corners will be applied automatically
   - File format: PNG (with transparency)

---

#### C. Screenshots

1. Go to **Screenshots** in Store listing

2. Upload for **Phone** (1080 × 1920 px):
   - Minimum: 2, Maximum: 8
   - Recommended: 5-6 screenshots
   - Suggested order:
     1. Home page with content
     2. Live TV with AI dubbing
     3. Context card example
     4. VOD library with AI features
     5. Visual Sync camera view

3. Upload for **Tablet** (1600 × 2560 px) - Optional:
   - Show full feature set on larger screen

---

#### D. Video Preview

1. Go to **Video** in Store listing
2. Upload a **30-second teaser** (optional):
   - Format: MP4, WebM
   - Aspect ratio: 9:16
   - Show quick clips of:
     - Real-time dubbing
     - Context cards
     - Sync features

---

### 4. App Content

1. Go to **App content** section

2. Configure **Age rating:**
   - Answer the questionnaire:
     - Violence: None
     - Sexual content: None
     - Profanity: None
     - Alcohol/tobacco/drugs: None
     - Gambling: None
   - **Resulting rating:** 3+ (or based on your content)

3. Configure **App content:**
   - **Ads:** No (unless you have ads)
   - **Internet required:** Yes
   - **In-app purchases:** No (unless applicable)

4. Configure **Sensitive information:**
   - **Location data:** Yes
   - **Other sensitive data:** None

---

### 5. Content Rating (IARC)

1. Go to **Content rating** section

2. Click **"Get rating"** (for first submission)

3. Complete **IARC questionnaire**:
   - App ID: Your app ID
   - Email: Your email
   - Answer all questions about content
   - Generate rating

4. Copy the **rating certificate** (automatic submission to Google Play)

---

### 6. Privacy & Safety

1. Go to **Privacy policy**

2. Enter **Privacy policy URL:**
```
https://bayit.tv/policy
```

3. Go to **Safety**

4. Fill in **Safety questionnaire**:
   - Does your app collect personal data? **Yes**
   - Does your app target children? **No**
   - Required device permissions:
     - ✓ Camera (for Visual Sync)
     - ✓ Microphone (for voice commands)
     - ✓ Location (for local content)

---

### 7. Pricing & Distribution

1. Go to **Pricing & distribution**

2. Configure:
   - **Pricing:** Free
   - **Available in these countries/regions:** Select all
   - **Government apps:** No
   - **Sensitive content:** No

---

### 8. Release Management

1. Go to **Releases** → **Create release**

2. Select **Internal testing** (for first QA round) or **Production** (for public)

3. Click **"Create release"**

4. Upload your **signed APK/AAB:**
   - Click "Upload"
   - Select your signed APK or AAB file
   - Wait for validation

5. Review **Release details:**
   - Version name: `1.0.0`
   - Version code: `1`
   - Release notes:
   ```
   AI-powered streaming platform with real-time dubbing and cultural context for Israeli content.
   ```

6. Click **"Review release"**

7. Verify all fields:
   - ✓ App icon
   - ✓ Screenshots
   - ✓ Feature graphic
   - ✓ Description
   - ✓ Privacy policy
   - ✓ All required metadata

8. Click **"Start rollout to Production"** → Confirm

---

### 9. Monitor Review Process

1. Go to **Releases** → **Production**

2. Monitor status:
   - **Preparing release:** Initial validation
   - **In review:** Google is reviewing your app
   - **Reviewed:** Waiting for automatic publishing
   - **Live on Play Store:** ✓ Approved!

**Expected Timeline:**
- Initial review: 2-4 hours
- May require additional review if:
  - Camera permissions (Visual Sync)
  - AI features detected
  - Streaming content
- Resubmission after fixes: 2-4 hours

---

## Handling Rejections

### Common Rejection Reasons

**1. Policy Violation: Streaming Content**
**Solution:**
- Add note: "Licensed content from Israeli broadcasters"
- Ensure you have rights to stream content
- Contact policy team with licensing agreements

**2. Missing Privacy Policy**
**Solution:**
- Ensure HTTPS link to privacy policy
- Privacy policy must mention:
  - Camera access (Visual Sync)
  - Microphone access (voice commands)
  - Location tracking
  - No personal data recording

**3. Camera Permission Not Justified**
**Solution:**
- Clearly show Visual Sync feature is optional
- Add onboarding that explains camera use
- Camera images are NOT stored or sent to servers

**4. AI Features Not Explained**
**Solution:**
- Clearly describe AI dubbing feature
- Show context cards in screenshots
- Explain how AI works (general terms)

### Resubmitting After Rejection

1. Fix the issues noted
2. Go to **Releases** → **Manage rollout**
3. Click **"Stop rollout"**
4. Create new release with updated version code
5. Upload fixed APK/AAB
6. Add notes:
```
Fixed: [What was corrected]
[Reference rejection reason]
```
7. Resubmit for review

---

## Post-Approval Steps

### 1. Share Your App

**Get your Play Store link:**
```
https://play.google.com/store/apps/details?id=tv.bayit.app
```

### 2. Verify App Page

1. Search "Bayit+" on Google Play Store
2. Check:
   - ✓ Title displays correctly
   - ✓ Icon is shown
   - ✓ Screenshots are visible
   - ✓ Description is formatted correctly
   - ✓ Rating (will start at 0)

### 3. Marketing Push

- Share link on social media
- Email users
- Update website: https://bayit.tv
- Include in press release

### 4. Monitor Reviews

1. Go to **Ratings & reviews**
2. Monitor user feedback
3. Respond to user issues
4. Track average rating

---

## Future Updates

### Preparing Version 2.0

1. Increment version code and name:
   - Version name: `2.0.0`
   - Version code: `2`

2. Update **Release notes:**
```
Version 2.0 - Major update:
- New features: [List 3-5 main features]
- Improvements: [Bug fixes and performance]
- Better AI context cards
```

3. Update screenshots if UI changed

4. Create new release (same process as initial upload)

5. Resubmit for review

---

## Troubleshooting

### App Won't Upload
**Error:** "Invalid APK" or "Signature issue"
**Solution:**
```bash
# Verify your APK signature
jarsigner -verify -verbose -certs build/app/outputs/bundle/release/app-release.aab

# Ensure you have:
# - Correct keystore file
# - Correct passwords
# - V2 signing enabled
```

### "Targeting Android 14+"
**Error:** "Target API level too low"
**Solution:**
In `android/app/build.gradle`, update:
```gradle
android {
    compileSdk 34  // Android 14
    defaultConfig {
        targetSdkVersion 34  // Android 14
    }
}
```

### App Gets Auto-Suspended
**Common Causes:**
- Camera permission misuse
- Streaming content policy violation
- Data collection not disclosed
**Solution:**
- Review Google Play policies
- Ensure privacy policy is comprehensive
- Contact support: support@bayit.tv

---

## Security Best Practices

### 1. Protect Your Keystore

```bash
# Make backup (offline)
cp android/app/keystore.jks ~/Secure_Backup/

# Document password securely
# Store in: Password manager (1Password, LastPass, etc.)
# DO NOT commit to Git
```

### 2. Code Obfuscation

Enable ProGuard/R8 in release builds:

```gradle
buildTypes {
    release {
        minifyEnabled true
        shrinkResources true
        proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
    }
}
```

### 3. API Keys Protection

Never hardcode API keys:

```java
// ❌ WRONG
String API_KEY = "sk-1234567890";

// ✓ CORRECT
String API_KEY = BuildConfig.API_KEY;  // From build variants
```

---

## Compliance Checklist

- ✓ Privacy policy URL provided
- ✓ All permissions justified
- ✓ No hardcoded credentials
- ✓ Age rating completed (IARC)
- ✓ Content rating questionnaire completed
- ✓ App icon and screenshots provided
- ✓ Feature graphic uploaded
- ✓ No policy violations
- ✓ Streaming rights confirmed
- ✓ AI features properly disclosed

---

## Support & Resources

**Official Documentation:**
- Google Play Console Help: https://support.google.com/googleplay/android-developer
- Policies & Guidelines: https://play.google.com/about/developer-content-policy/
- Publishing Checklist: https://developer.android.com/studio/publish/

**Bayit+ Support:**
- Email: support@bayit.tv
- Website: https://bayit.tv
- Privacy Policy: https://bayit.tv/policy

---

**Version Control:** Update this document with each new app release
**Last Updated:** 2026-01-27
**Next Update:** After first production release
