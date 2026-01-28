# tvOS App Store Upload Guide

This guide covers uploading the Bayit+ tvOS app to App Store Connect for TestFlight and App Store submission.

## Prerequisites Checklist

- [x] Release build successful
- [x] Code signing certificates configured (Apple Distribution)
- [x] App Store Connect account access
- [x] Bundle ID registered: `tv.bayit.plus.tv`
- [x] 3+ screenshots prepared (in `fastlane/screenshots/en-US/`)
- [x] App metadata prepared (in `fastlane/metadata/en-US/`)

## Method 1: Upload via Xcode (Recommended for First Upload)

### Step 1: Archive the App

1. Open the project in Xcode:
   ```bash
   cd tvos-app
   open tvos/BayitPlusTVOS.xcworkspace
   ```

2. Select the actual device or "Any tvOS Device (arm64)" from the scheme dropdown (NOT a simulator)

3. Archive the app:
   - Menu: **Product → Archive**
   - Wait for archive to complete (2-5 minutes)
   - Archives window should open automatically

### Step 2: Validate the Archive

1. In the Archives window, select the latest archive
2. Click **"Distribute App"**
3. Select **"App Store Connect"**
4. Click **"Next"**
5. Select **"Upload"** (not Export)
6. Click **"Next"**

7. Configure distribution options:
   - ✓ Include app symbols for crash reporting
   - ✓ Upload your app's symbols to receive symbolicated crash logs
   - ✓ Manage Version and Build Number (Xcode can auto-increment)
   - Click **"Next"**

8. Re-sign with Apple Distribution certificate:
   - Should auto-select: "Apple Distribution: Gil Klainert (963B7732N5)"
   - Click **"Next"**

9. Review app information:
   - Bundle ID: `tv.bayit.plus.tv`
   - Version: 1.0
   - Build: 1 (or auto-incremented)
   - Click **"Upload"**

10. Wait for upload to complete (5-10 minutes depending on connection)

### Step 3: Processing on App Store Connect

After upload completes:
- Build appears in App Store Connect within 5-10 minutes
- Processing takes 10-30 minutes
- You'll receive an email when processing completes

## Method 2: Upload via Fastlane (For Automation)

### Step 1: Install Fastlane

```bash
# Install fastlane if not already installed
gem install fastlane

# Or via Homebrew
brew install fastlane
```

### Step 2: Initialize Fastlane

```bash
cd tvos-app
fastlane init

# Select option 4: "Manual setup"
# Follow prompts to configure App Store Connect credentials
```

### Step 3: Create Fastfile

Create `fastlane/Fastfile` with this content:

```ruby
default_platform(:ios)

platform :ios do
  desc "Build and upload tvOS app to TestFlight"
  lane :beta do
    # Increment build number
    increment_build_number(xcodeproj: "tvos/BayitPlusTVOS.xcodeproj")

    # Build the app
    build_app(
      workspace: "tvos/BayitPlusTVOS.xcworkspace",
      scheme: "BayitPlusTVOS",
      configuration: "Release",
      export_method: "app-store",
      export_options: {
        provisioningProfiles: {
          "tv.bayit.plus.tv" => "match AppStore tv.bayit.plus.tv"
        }
      }
    )

    # Upload to TestFlight
    upload_to_testflight(
      skip_waiting_for_build_processing: true
    )
  end

  desc "Upload existing build to TestFlight"
  lane :upload do
    upload_to_testflight(
      ipa: "./BayitPlusTVOS.ipa",
      skip_waiting_for_build_processing: true
    )
  end

  desc "Capture screenshots for App Store"
  lane :screenshots do
    capture_screenshots(
      output_directory: "./fastlane/screenshots",
      scheme: "BayitPlusTVOS"
    )
  end
end
```

### Step 4: Create Appfile

Create `fastlane/Appfile` with:

```ruby
app_identifier("tv.bayit.plus.tv")
apple_id("your-apple-id@example.com")  # Replace with your Apple ID
team_id("963B7732N5")  # Your Team ID

# For App Store Connect
itc_team_id("your-itc-team-id")  # Get from App Store Connect
```

### Step 5: Run Fastlane

```bash
# Upload to TestFlight
fastlane beta

# Or just upload an existing IPA
fastlane upload
```

## App Store Connect Configuration

### Step 1: Create App in App Store Connect

1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Click **"My Apps"**
3. Click **"+"** → **"New App"**
4. Fill in app information:
   - **Platform:** tvOS
   - **Name:** Bayit+
   - **Primary Language:** English (US)
   - **Bundle ID:** tv.bayit.plus.tv
   - **SKU:** tv-bayit-plus (or similar unique ID)
5. Click **"Create"**

### Step 2: Configure App Information

#### General Information:
- **App Name:** Bayit+
- **Subtitle:** Israeli Media Streaming Platform
- **Category:** Primary: Entertainment, Secondary: News
- **Content Rights:** Select appropriate options

#### Age Rating:
- Complete questionnaire based on content
- Likely rating: 12+ or 17+ depending on content

#### App Privacy:
- Configure privacy policy URL
- Complete data collection questionnaire
- Specify: Location, Usage Data, Identifiers (if applicable)

### Step 3: Upload Screenshots

1. In App Store Connect → App → tvOS → Screenshots
2. Upload screenshots from `fastlane/screenshots/en-US/`:
   - Apple TV 4K (3840 x 2160): All 3 screenshots
   - Need 3-10 screenshots total

**Current screenshots:**
- `Apple_TV_4K_01_home.png` - Home screen
- `Apple_TV_4K_02_livetv.png` - Live TV section
- `Apple_TV_4K_03_home_hero.png` - Home with hero section

**To add more screenshots:**
```bash
# Navigate to desired section in simulator, then run:
./scripts/capture-screenshot.sh vod
./scripts/capture-screenshot.sh radio
./scripts/capture-screenshot.sh podcasts
```

### Step 4: App Description

Copy from `fastlane/metadata/en-US/description.txt`:

```
Bayit+ brings the best of Israeli and Jewish media content to your Apple TV.

Stream Live TV Channels:
• Watch Israel Channel 11, Channel 12, Channel 13, Channel 14 live
• Follow Kan (Israeli Public Broadcasting) with all channels
• Enjoy Israeli news and current affairs in real-time

On-Demand Content:
• Browse thousands of Israeli TV shows, movies, and series
• Access exclusive documentaries and cultural content
• Watch with Hebrew, English, and multilingual subtitles

Israeli Radio:
• Listen to all major Israeli radio stations
• Enjoy music, news, and talk shows
• Stream 24/7 with crystal-clear quality

Jewish & Religious Content:
• Access Jewish learning and Torah content
• Shabbat mode for observant users
• Holiday specials and seasonal programming

Podcasts:
• Discover Israeli podcasts on every topic
• Subscribe to your favorite shows
• Offline listening support

Features:
• 4K HDR support on Apple TV 4K
• Multiple language support (Hebrew, English, and more)
• Personalized recommendations
• Parental controls
• Cloud sync across all your devices
• Voice search via Siri Remote
• Picture-in-picture support

Stay connected to Israeli culture, news, and entertainment wherever you are. Bayit+ is your home for Israeli media on Apple TV.
```

### Step 5: Keywords

Use keywords from `fastlane/metadata/en-US/keywords.txt`:
```
israeli tv,israel news,hebrew,live tv,kan,channel 12,channel 13,jewish,judaism,radio,podcasts,streaming,media
```

### Step 6: TestFlight Configuration

1. In App Store Connect → TestFlight
2. Wait for build to process
3. Add internal testers:
   - Click **"App Store Connect Users"**
   - Add team members
   - Enable automatic distribution

4. Add external testers (optional):
   - Click **"External Groups"**
   - Create a new group
   - Add up to 10,000 external testers
   - Note: External testing requires Beta App Review

## TestFlight Testing

### For Internal Testers:

1. Testers receive email invitation
2. Install TestFlight app on Apple TV
3. Accept invitation
4. Install Bayit+ beta app
5. Provide feedback via TestFlight

### Testing Checklist:

- [ ] App launches successfully
- [ ] All sections accessible (Home, Live TV, VOD, Radio, Podcasts)
- [ ] Video playback works
- [ ] Audio quality is good
- [ ] Navigation is smooth
- [ ] Search functionality works
- [ ] No crashes or major bugs

## Final App Store Submission

### Step 1: Complete App Review Information

1. In App Store Connect → App → App Store → Version
2. Fill required fields:
   - **App Review Information:**
     - Contact info (phone, email)
     - Demo account (if needed for review)
   - **Version Release:**
     - Automatic or manual release after approval

### Step 2: Submit for Review

1. Review all sections (green checkmarks required)
2. Click **"Add for Review"**
3. Click **"Submit to App Review"**

### Step 3: Monitor Review Status

Review typically takes:
- **Initial review:** 24-48 hours
- **Follow-up reviews:** 12-24 hours

Status updates:
- Waiting for Review → In Review → Pending Developer Release → Ready for Sale

## Troubleshooting

### "Invalid Binary" Error

**Solution:**
- Check code signing settings in Xcode
- Ensure using Apple Distribution certificate
- Verify provisioning profile is for App Store

### "Missing Required Icon"

**Solution:**
- Check all app icon sizes in `Assets.xcassets/AppIcon.appiconset`
- Required sizes for tvOS: 1280x768, 400x240

### "Invalid Screenshot Size"

**Solution:**
- Screenshots must be exactly 3840x2160 for Apple TV 4K
- Use PNG format
- No transparency

### Upload Hangs or Fails

**Solution:**
- Check internet connection
- Try uploading via Xcode instead of fastlane
- Use Application Loader as alternative upload method

## Build Version Management

### Increment Build Number

**Manually in Xcode:**
1. Select project in navigator
2. Select BayitPlusTVOS target
3. General tab → Identity
4. Increment **Build** number (e.g., 1 → 2)

**Via Command Line:**
```bash
agvtool next-version -all
```

**Via Fastlane:**
```bash
fastlane run increment_build_number
```

## App Store Review Guidelines

Ensure compliance:
- [ ] No beta/test language in UI
- [ ] All features functional (no "Coming Soon")
- [ ] Privacy policy URL provided
- [ ] Accurate app description
- [ ] Appropriate age rating
- [ ] No unauthorized third-party content
- [ ] Complies with streaming content guidelines

## Resources

- [App Store Connect](https://appstoreconnect.apple.com)
- [TestFlight](https://developer.apple.com/testflight/)
- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Fastlane Docs](https://docs.fastlane.tools/)
- [tvOS Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/tvos)

---

**Status:** Ready for upload ✅

**Next Action:** Upload build via Xcode (Method 1) or configure Fastlane (Method 2)
