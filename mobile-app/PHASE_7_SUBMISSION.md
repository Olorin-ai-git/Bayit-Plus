# Phase 7: App Store Submission - Step-by-Step Guide

Complete walkthrough for submitting Bayit+ to the App Store.

**Estimated Time**: 1 week (3-5 days active work + review time)
**Status**: Ready to Execute

---

## Overview

This guide walks you through:
1. Pre-submission checklist
2. Build preparation
3. App Store Connect setup
4. Submission process
5. Post-submission monitoring

---

## Day 1: Pre-Submission Preparation

### Morning: Code & Build Verification

#### 1. Clean Build Test

```bash
cd /Users/olorin/Documents/olorin/mobile-app

# Clean all build artifacts
rm -rf ios/build
rm -rf ios/Pods
cd ios && pod install && cd ..

# Clean Xcode derived data
rm -rf ~/Library/Developer/Xcode/DerivedData

# Open in Xcode
open ios/BayitPlus.xcworkspace
```

In Xcode:
1. **Product** → **Clean Build Folder** (Cmd+Shift+K)
2. **Product** → **Build** (Cmd+B)
3. Verify: No errors, no warnings

#### 2. Version & Build Number Check

**File**: `ios/BayitPlus/Info.plist`

```xml
<key>CFBundleShortVersionString</key>
<string>1.0.0</string>
<key>CFBundleVersion</key>
<string>1</string>
```

**Version**: 1.0.0 (marketing version)
**Build**: 1 (increment for each upload)

#### 3. Signing & Provisioning

In Xcode:
1. Select **BayitPlus** target
2. **Signing & Capabilities** tab
3. Select your **Team**
4. Provisioning Profile: **Automatic** (Xcode Managed)
5. Bundle Identifier: `tv.bayit.plus`

Verify all capabilities enabled:
- [x] App Groups (`group.tv.bayit.plus`)
- [x] Background Modes (audio, processing, remote-notification)
- [x] CarPlay (if entitlement approved)
- [x] Siri
- [x] Push Notifications (if used)

#### 4. Run Final Tests

**iPhone Simulator**:
```bash
react-native run-ios --simulator="iPhone 14 Pro"
```

Test checklist:
- [ ] App launches successfully
- [ ] No crashes on launch
- [ ] Voice button visible
- [ ] Tap voice button → Permission prompt
- [ ] Grant permissions → Voice works
- [ ] Navigate all tabs
- [ ] Open PiP widget
- [ ] Drag widget → Smooth animation
- [ ] Switch to Hebrew → RTL works

**iPad Simulator**:
```bash
react-native run-ios --simulator="iPad Pro (12.9-inch) (6th generation)"
```

Test iPad-specific:
- [ ] Multi-column layouts render correctly
- [ ] Multiple widgets work
- [ ] Landscape orientation works

### Afternoon: Archive & Upload

#### 5. Create Archive

In Xcode:
1. Select **Any iOS Device** (not simulator)
2. **Product** → **Archive**
3. Wait 5-10 minutes for build
4. Organizer window opens automatically

**Troubleshooting**:
- **"No signing certificate"**: Xcode → Preferences → Accounts → Download Manual Profiles
- **"Provisioning profile expired"**: Xcode will automatically create new one
- **"Code signing failed"**: Clean build folder and try again

#### 6. Upload to App Store Connect

In Organizer:
1. Select latest archive
2. Click **Distribute App**
3. Select **App Store Connect**
4. Click **Upload**

Upload options:
- [x] Upload your app's symbols (for crash reports)
- [x] Strip Swift symbols (reduce size)
- [ ] Include bitcode (deprecated in Xcode 14+)

Click **Upload** → Wait 10-20 minutes

**Confirmation**:
- Email from Apple: "Your app has been uploaded"
- Processing time: 15-30 minutes
- Check status at: https://appstoreconnect.apple.com

---

## Day 2: App Store Connect Setup

### Morning: Create App Record

#### 1. Log In to App Store Connect

https://appstoreconnect.apple.com

**Navigate**: My Apps → + (top left) → New App

**Fill in**:
- **Platforms**: iOS
- **Name**: Bayit+
- **Primary Language**: Hebrew
- **Bundle ID**: tv.bayit.plus (select from dropdown)
- **SKU**: bayit-plus-ios-001
- **User Access**: Full Access

Click **Create**

#### 2. App Information

**Navigate**: My Apps → Bayit+ → App Information

**Category**:
- Primary: Entertainment
- Secondary: News (optional)

**Age Rating**: Click "Edit"
- Made for Kids: No
- Frequent/Intense Realistic Violence: No
- Frequent/Intense Cartoon/Fantasy Violence: No
- Sexual Content: No
- Nudity: No
- Alcohol/Tobacco/Drug Use: No
- Mature/Suggestive Themes: No
- Horror/Fear Themes: No
- Gambling: No
- Profanity/Crude Humor: No
- Unrestricted Web Access: No
- Medical/Treatment Info: No

**Result**: 12+ rating

**Copyright**: © 2026 Bayit Plus Ltd.

**Contact Information**:
- Name: Support Team
- Phone: +972-XX-XXX-XXXX
- Email: support@bayit.tv

**URLs**:
- Privacy Policy: https://bayit.tv/privacy
- Terms of Use: https://bayit.tv/terms (optional)

Click **Save**

### Afternoon: Version 1.0 Setup

#### 3. Create Version 1.0

**Navigate**: My Apps → Bayit+ → iOS App → + Version or Platform

Version Number: **1.0**

#### 4. Version Information

**What's New in This Version** (4000 chars max):

```
🎉 Welcome to Bayit+ 1.0!

🎙️ VOICE-FIRST EXPERIENCE
• Wake word activation: Just say "Hey Bayit"
• Natural language commands in Hebrew, English, Spanish
• Proactive AI suggestions
• Emotional intelligence adapts to your mood

📺 CONTENT
• Live TV: Channel 13, 12, Kan 11
• 100+ Podcasts
• Live Radio: Galatz, Galei Tzahal, Kol Rega
• On-demand shows and series

🪟 PICTURE-IN-PICTURE WIDGETS
• Floating video widgets
• Drag, resize, minimize
• Multiple widgets on iPad

🍎 IOS INTEGRATION
• Siri Shortcuts
• Home Screen Widgets
• CarPlay support (audio)
• SharePlay (coming soon)

🌟 SMART FEATURES
• Multi-turn conversations
• Morning ritual personalization
• Context-aware commands
• Hebrew RTL support

Thank you for downloading Bayit+!
Report issues: support@bayit.tv
```

**Promotional Text** (170 chars, appears above description):

```
Israel's first voice-first streaming platform. Control everything with your voice. Live TV, podcasts, radio - all in Hebrew, English, Spanish. Say "Hey Bayit" to start!
```

**Description** (4000 chars max):

Use the English description from APP_STORE_ASSETS.md

**Keywords** (100 chars, comma-separated):

```
streaming,live tv,israeli,voice control,podcasts,radio,carplay,siri,hebrew,channel 13
```

**Support URL**: https://bayit.tv/support

**Marketing URL** (optional): https://bayit.tv

#### 5. Screenshots & Previews

**iPhone 6.7" Display** (1290 x 2796 pixels) - REQUIRED
- [ ] Screenshot 1: Home Screen
- [ ] Screenshot 2: PiP Widget
- [ ] Screenshot 3: Voice Command
- [ ] Screenshot 4: Search Results (Hebrew)
- [ ] Screenshot 5: Player Screen

**iPad Pro (6th gen) 12.9"** (2048 x 2732 pixels) - REQUIRED
- [ ] Screenshot 1: Home Screen (multi-column)
- [ ] Screenshot 2: Multiple Widgets
- [ ] Screenshot 3: Voice Interface
- [ ] Screenshot 4: Landscape Mode
- [ ] Screenshot 5: Search & Player

**App Preview Video** (optional): Upload .mov or .mp4 (15-30 seconds)

*Note*: Screenshots must be created before submission. See APP_STORE_ASSETS.md for templates.

#### 6. Build Selection

**Navigate**: Build section → Click "+"

Select build: **1.0 (1)** (the one uploaded earlier)

If build not visible:
- Wait 15-30 minutes for processing
- Refresh page
- Check email for processing completion

**Export Compliance**:
- Does your app use encryption? **No** (standard HTTPS doesn't count)
- If Yes: Complete compliance documentation

Click **Save**

---

## Day 3: App Privacy & Pricing

### Morning: App Privacy Information

#### 7. Privacy Policy

**Navigate**: App Privacy section

**Data Collection**:

Click **Get Started**

**Data Types Collected**:

1. **Contact Info**
   - [x] Email Address
   - Linked to user: Yes
   - Used for tracking: No
   - Purpose: Account creation, Customer support

2. **Usage Data**
   - [x] Product Interaction (viewing history)
   - [x] Search History
   - Linked to user: Yes
   - Used for tracking: No
   - Purpose: App functionality, Personalization

3. **Diagnostics**
   - [x] Crash Data
   - [x] Performance Data
   - Linked to user: No
   - Used for tracking: No
   - Purpose: App functionality, Bug fixes

**Data Not Collected**:
- Location
- Photos/Videos
- Financial Info
- Health & Fitness
- Contacts
- Messages
- User Content (besides viewing history)

Click **Publish**

### Afternoon: Pricing & Availability

#### 8. Pricing & Availability

**Navigate**: Pricing and Availability

**Price**: Free (with in-app purchases if applicable)

**Availability**:
- [x] Available in all territories
- Or select: Israel, United States (recommended for v1.0)

**Pre-Order**: Not available (can't enable after app exists)

**App Distribution**:
- Available on: App Store for iPhone and iPad

Click **Save**

---

## Day 4: Final Review & Submission

### Morning: Review Notes for Reviewers

#### 9. App Review Information

**Navigate**: App Review Information

**Sign-in Required**: Yes

**Demo Account**:
```
Username: reviewer@bayit.tv
Password: BayitReview2026!
```

**Important**: Create this account in your system with:
- Access to all features
- Pre-loaded content/favorites
- No payment required
- Israeli content accessible (or demo content)

**Contact Information**:
- First Name: App
- Last Name: Review Team
- Phone: +972-XX-XXX-XXXX
- Email: appreview@bayit.tv

**Notes** (4000 chars max):

```
Dear App Review Team,

Thank you for reviewing Bayit+, Israel's first voice-first streaming platform.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📱 TEST ACCOUNT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Email: reviewer@bayit.tv
Password: BayitReview2026!

This account has full access to all features and demo content.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎙️ VOICE FEATURES (Core Functionality)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

The app is voice-first. To test:

1. GRANT PERMISSIONS
   - On first launch, grant Microphone permission
   - Grant Speech Recognition permission
   - Both are required for voice features

2. TAP TO SPEAK
   - Tap microphone button (bottom-right corner)
   - Speak any of these commands:

     English:
     • "Play Channel 13"
     • "Show podcasts"
     • "Search for comedy"
     • "Open live TV"

     Hebrew (if comfortable):
     • "תפתח ערוץ 13" (Open Channel 13)
     • "חפש קומדיה" (Search comedy)

3. WAKE WORD (Optional)
   - Say "Hey Bayit" to activate voice
   - Then speak any command
   - May require 2-3 attempts for calibration

4. VOICE RESPONSES
   - App responds with text-to-speech
   - Confirms actions: "Playing Channel 13"
   - Provides feedback for all commands

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🪟 PICTURE-IN-PICTURE WIDGETS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Browse to Home screen
2. Tap any content card → "Add Widget" button
3. Widget appears as floating overlay
4. Drag widget around screen
5. Pinch to resize
6. Double-tap to minimize

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🍎 IOS INTEGRATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SIRI SHORTCUTS:
1. Say: "Hey Siri, play Channel 13 on Bayit Plus"
2. Works after using feature 2-3 times in app
3. Donations happen automatically during usage

HOME SCREEN WIDGETS:
1. Long press Home Screen → "+"
2. Search "Bayit+"
3. Add "Live Channel" widget
4. Tap widget → Opens app with content

CARPLAY (if entitlement approved):
1. Simulator: I/O → External Displays → CarPlay
2. Open Bayit+ in CarPlay
3. Audio-only content (radio, podcasts)
4. Full playback controls

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🌍 HEBREW LANGUAGE (RTL)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

To test Hebrew:
1. Settings → Language → עברית (Hebrew)
2. Entire UI switches to RTL layout
3. Voice commands work in Hebrew
4. Text-to-speech responds in Hebrew

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📝 IMPORTANT NOTES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

• Voice features require microphone permission
• Some content may show "Demo Mode" message
• CarPlay requires entitlement (Application ID: [YOUR_ID])
• Wake word detection may take 2-3 attempts initially
• Hebrew voice commands work best with native speakers

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎥 DEMO VIDEO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Video demonstration: https://bayit.tv/demo-video.mp4
Shows voice commands, PiP widgets, Siri integration

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📧 CONTACT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Questions or issues?
Email: appreview@bayit.tv
Phone: +972-XX-XXX-XXXX

Thank you for reviewing Bayit+!
We're excited to bring voice-first streaming to iOS.

- The Bayit+ Team
```

**Attachments** (optional):
- Demo video file
- Additional screenshots
- CarPlay entitlement approval email

Click **Save**

#### 10. Version Release

**Navigate**: Version Release section

**Release Options**:
- ⚫ Automatically release this version (recommended for v1.0)
- ⚪ Manually release this version (if you want to control timing)
- ⚪ Schedule for release (specific date/time)

Select: **Automatically release**

Click **Save**

### Afternoon: Final Checks & Submit

#### 11. Final Pre-Submission Checklist

Go through this checklist one more time:

**App Information**:
- [ ] App name: Bayit+
- [ ] Subtitle: Israeli Content Streaming
- [ ] Category: Entertainment
- [ ] Age rating: 12+
- [ ] Copyright: © 2026 Bayit Plus Ltd.
- [ ] Privacy Policy URL present
- [ ] Support URL present

**Version 1.0**:
- [ ] Version number: 1.0
- [ ] Build number: 1
- [ ] What's New text written
- [ ] Description complete (English + Hebrew if localized)
- [ ] Keywords entered
- [ ] iPhone screenshots uploaded (5 required)
- [ ] iPad screenshots uploaded (5 required)
- [ ] Build selected

**App Privacy**:
- [ ] Data collection types listed
- [ ] Privacy practices published

**Pricing**:
- [ ] Price: Free
- [ ] Territories selected
- [ ] Availability confirmed

**App Review**:
- [ ] Test account provided
- [ ] Contact info complete
- [ ] Reviewer notes written
- [ ] Release option selected

#### 12. Submit for Review

**Navigate**: My Apps → Bayit+ → iOS App → Version 1.0

At the top right, click: **Add for Review**

**Review screen**:
- Advertising Identifier: No (unless using ads)
- Content Rights: Yes (you own or have rights)
- Government Restrictions: No (unless applicable)

Click: **Submit for Review**

**Confirmation**:
- Status changes to: "Waiting for Review"
- Email confirmation from Apple
- Review typically takes 24-48 hours

---

## Day 5: Post-Submission Monitoring

### Status Tracking

#### Review Status Timeline

1. **Waiting for Review**: 0-24 hours
   - App in queue
   - No action needed

2. **In Review**: 24-48 hours
   - Reviewer is testing your app
   - Check email frequently

3. **Pending Developer Release**: If approved
   - App approved, waiting for your release
   - Click "Release this Version" if manual release

4. **Ready for Sale**: App is live! 🎉
   - Available on App Store
   - Users can download

#### Common Review Issues

**If status changes to "Metadata Rejected"**:
- Metadata issue (description, screenshots)
- Fix in App Store Connect
- Resubmit (no new build needed)

**If status changes to "Rejected"**:
1. Read rejection reason in Resolution Center
2. Common reasons:
   - Missing test account or doesn't work
   - Permissions not explained clearly
   - Crashes on reviewer's device
   - Guideline violation

3. Fix issues:
   - Update code if needed
   - Upload new build
   - Respond in Resolution Center
   - Resubmit

**If status changes to "Developer Rejected"**:
- You rejected it yourself (accident?)
- Can resubmit anytime

### Monitoring Tools

#### 1. App Store Connect App (iOS)

Download from App Store:
- Monitor review status
- Respond to reviewer
- View crash reports
- Read user reviews

#### 2. Email Notifications

Apple sends emails for:
- Upload processed
- Ready for review
- In review
- Approved
- Rejected
- Live on App Store

#### 3. Crash Reports

**Navigate**: App Store Connect → My Apps → Bayit+ → TestFlight → Version 1.0 → Crashes

Check daily for:
- Crash frequency
- Affected users
- Stack traces

---

## Post-Approval (Day 6-7)

### App Goes Live

#### 1. Verify App Store Listing

Search App Store for "Bayit+"

Check:
- [ ] App icon displays correctly
- [ ] Screenshots look good
- [ ] Description readable
- [ ] Rating shows "No Ratings Yet"
- [ ] Download button works

#### 2. Initial Testing

Download app from App Store (not TestFlight):
- [ ] Install completes
- [ ] App launches
- [ ] No crashes
- [ ] Voice features work
- [ ] All permissions requested correctly

#### 3. Monitor First 24 Hours

**Crash Reports**:
- Check hourly first day
- Address any critical crashes immediately

**Reviews**:
- Respond to first reviews (positive and negative)
- Thank early adopters
- Address concerns quickly

**Downloads**:
- Track in App Store Connect → Analytics
- Share milestones on social media

#### 4. Prepare Update (v1.0.1)

Start planning first update:
- Bug fixes from user reports
- Minor improvements
- Build number: 2
- Can submit immediately if critical fixes needed

---

## Troubleshooting

### Common Submission Issues

#### Build Not Appearing

**Problem**: Can't select build in App Store Connect

**Solutions**:
1. Wait 15-30 minutes after upload
2. Refresh page (Cmd+R)
3. Check email for processing errors
4. Verify export compliance answered
5. Check build wasn't rejected during processing

#### Missing Compliance

**Problem**: "Your app uses encryption"

**Solution**:
1. For standard HTTPS: Select "No"
2. For custom encryption: Complete compliance forms
3. Add to Info.plist:
```xml
<key>ITSAppUsesNonExemptEncryption</key>
<false/>
```

#### Provisioning Profile Issues

**Problem**: "No matching provisioning profiles found"

**Solutions**:
1. Xcode → Preferences → Accounts → Download Manual Profiles
2. Select "Automatic" signing in Xcode
3. Revoke and recreate certificates if needed
4. Ensure bundle ID matches exactly

#### Archive Fails

**Problem**: "Archive failed" error

**Solutions**:
1. Clean build folder (Cmd+Shift+K)
2. Delete derived data
3. Restart Xcode
4. Check for code signing errors in logs
5. Verify all dependencies installed (`pod install`)

---

## Success Checklist

Before considering Phase 7 complete:

- [ ] App uploaded to App Store Connect
- [ ] Build processing completed
- [ ] App information complete
- [ ] Screenshots uploaded
- [ ] Privacy information submitted
- [ ] Test account created and verified
- [ ] Reviewer notes written
- [ ] Submitted for review
- [ ] Status: "Waiting for Review" or better
- [ ] Monitoring in place for approval

---

## Next Steps After Launch

1. **Monitor closely** for first 48 hours
2. **Respond to reviews** within 24 hours
3. **Fix critical bugs** immediately (v1.0.1)
4. **Gather user feedback** for v1.1
5. **Plan v1.1 features**:
   - SharePlay (if requested)
   - Offline mode
   - Additional content
   - User-requested features

---

## Resources

**Apple Documentation**:
- App Store Review Guidelines: https://developer.apple.com/app-store/review/guidelines
- App Store Connect Help: https://help.apple.com/app-store-connect
- Common Rejection Reasons: https://developer.apple.com/app-store/review/rejections

**Community**:
- Apple Developer Forums: https://developer.apple.com/forums
- Stack Overflow: https://stackoverflow.com/questions/tagged/ios
- Reddit: r/iOSProgramming

---

## Timeline Summary

| Day | Tasks | Duration |
|-----|-------|----------|
| 1 | Pre-submission prep, Archive, Upload | 4-6 hours |
| 2 | App Store Connect setup | 3-4 hours |
| 3 | Privacy, Pricing, Screenshots | 4-6 hours |
| 4 | Final review, Submit | 2-3 hours |
| 5-7 | Waiting for review | Passive |
| 7 | Approved & Live! | 🎉 |

**Total Active Work**: 13-19 hours
**Total Calendar Time**: 5-7 days

---

**Status**: Ready to Execute Phase 7! 🚀

*Follow this guide step-by-step and Bayit+ will be live on the App Store within a week!*
