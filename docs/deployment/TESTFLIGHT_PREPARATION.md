# TestFlight Preparation Guide - Bayit+ iOS

**Status**: In Progress
**React Native Version**: 0.83.1
**Target**: TestFlight Beta Distribution

## Current Status

### ✅ Completed
- [x] App builds successfully
- [x] Info.plist cleaned (removed development-only permissions)
- [x] App icons configured (all sizes)
- [x] Launch screen configured
- [x] Privacy descriptions added for all permissions
- [x] Privacy Policy URL configured (https://bayit.tv/policy)
- [x] Export compliance set (no encryption)
- [x] Background modes configured (audio, fetch)
- [x] Deep linking configured (bayitplus://)
- [x] Bundle ID set (tv.bayit.plus)
- [x] Version configured (1.0, build 1)

### ⚠️ Known Issues
- DeviceInfo TurboModule timing bug (React Native 0.83.1)
  - Error boundary implemented for graceful recovery
  - Patches applied to node_modules
  - Will be permanently fixed with React Native 0.84 upgrade

###  ❌ Blockers Remaining
- [ ] Verify app launches without red error screen
- [ ] Test all core features work correctly
- [ ] Configure code signing for distribution

## Prerequisites

### Apple Developer Account
- [ ] Apple Developer Program membership active ($99/year)
- [ ] Developer team ID: [TBD]
- [ ] App Store Connect access verified

### Certificates & Provisioning
- [ ] iOS Distribution Certificate created
- [ ] App Store Provisioning Profile created
- [ ] Bundle ID registered (tv.bayit.plus)
- [ ] Push Notification entitlements configured (if needed)

### App Store Connect
- [ ] App created in App Store Connect
- [ ] App name reserved: "Bayit+: Smart Israeli TV"
- [ ] Primary category selected
- [ ] Age rating determined
- [ ] Privacy policy URL verified accessible

## TestFlight Distribution Steps

### Phase 1: Release Build Configuration

```bash
# 1. Clean everything
cd /Users/olorin/Documents/olorin/olorin-media/bayit-plus/mobile-app/ios
rm -rf build Pods ~/Library/Developer/Xcode/DerivedData/BayitPlus-*

# 2. Reinstall dependencies
pod install

# 3. Open Xcode
open BayitPlus.xcworkspace
```

#### In Xcode:
1. Select "BayitPlus" scheme → "Any iOS Device"
2. Product → Scheme → Edit Scheme
3. Change Build Configuration to "Release"
4. Build Settings → Code Signing:
   - Signing Certificate: "iOS Distribution"
   - Provisioning Profile: "App Store"
   - Team: [Your Team]
5. Build Settings → Deployment:
   - iOS Deployment Target: 16.0 (minimum supported)
   - Skip Install: NO
   - Strip Debug Symbols During Copy: YES

### Phase 2: Archive Build

```bash
# Command line archive (alternative to Xcode UI)
xcodebuild archive \
  -workspace BayitPlus.xcworkspace \
  -scheme BayitPlus \
  -configuration Release \
  -archivePath ~/Desktop/BayitPlus.xcarchive \
  -allowProvisioningUpdates
```

#### Or in Xcode:
1. Product → Archive
2. Wait for build to complete (~5-10 minutes)
3. Organizer window opens automatically
4. Select the archive

### Phase 3: Upload to App Store Connect

#### Using Xcode Organizer:
1. Click "Distribute App"
2. Select "App Store Connect"
3. Select "Upload"
4. Choose distribution certificate and provisioning profile
5. Review entitlements and app information
6. Click "Upload"
7. Wait for processing (5-15 minutes)

#### Or using `xcrun altool` (command line):
```bash
xcrun altool --upload-app \
  --type ios \
  --file ~/Desktop/BayitPlus.ipa \
  --apiKey [API_KEY_ID] \
  --apiIssuer [ISSUER_ID]
```

### Phase 4: TestFlight Configuration

In App Store Connect:
1. Navigate to "TestFlight" tab
2. Select the uploaded build
3. Fill in "What to Test" notes:
   ```
   Bayit+ Beta - Build 1.0 (1)

   Features to Test:
   - Stream Israeli TV channels
   - Browse content library
   - Voice command with "Hey Bayit"
   - Background audio playback
   - Content search and discovery

   Known Issues:
   - Temporary initialization delay on first launch (React Native 0.83.1 bug)
   - This will be fixed in next update

   Please report any crashes, UI issues, or unexpected behavior.
   ```

4. Configure Internal Testing:
   - Add internal testers (developers, QA team)
   - Enable automatic distribution for new builds
   - Set feedback email

5. Configure External Testing (after internal testing passes):
   - Create external test group
   - Add up to 10,000 external testers
   - Submit for Beta App Review (required for external testing)

### Phase 5: Beta App Review (External Testing Only)

For external TestFlight distribution, app must pass Beta App Review:
- Review typically takes 24-48 hours
- App must not crash on launch
- All permissions must be justified
- Privacy policy must be accessible
- Content must comply with App Store guidelines

#### Review Information to Provide:
- Demo account credentials (if sign-in required)
- Notes for reviewers about known issues
- Contact information for questions

## Testing Checklist

### Internal Testing (Team Members)
- [ ] App installs successfully
- [ ] App launches without crashes
- [ ] All screens navigate correctly
- [ ] Video streaming works
- [ ] Audio playback works
- [ ] Voice commands respond
- [ ] Background audio continues playing
- [ ] Deep linking works (bayitplus:// URLs)
- [ ] Search and discovery functional
- [ ] No memory leaks during extended use
- [ ] Battery usage reasonable
- [ ] Network errors handled gracefully

### External Testing (Beta Users)
- [ ] 50+ installs completed
- [ ] Crash rate < 1%
- [ ] Average session duration > 5 minutes
- [ ] User feedback collected
- [ ] Critical bugs identified and fixed
- [ ] Performance metrics acceptable

## Rollout Strategy

### Week 1: Internal Testing
- 5-10 internal testers
- Daily builds with fixes
- Focus: stability and core features

### Week 2: Limited External Beta
- 50-100 external testers
- Builds every 2-3 days
- Focus: user experience and edge cases

### Week 3: Expanded Beta
- 500-1000 external testers
- Weekly builds
- Focus: performance and scale

### Week 4: Pre-Production
- 5000+ external testers
- Release candidate builds only
- Focus: final validation

## Metrics to Monitor

### Crash Reporting (via Sentry)
```
SENTRY_DSN configured in Info.plist
Monitor: https://sentry.io/organizations/olorin/projects/bayit-plus
```

Key metrics:
- Crash-free sessions rate (target: >99.9%)
- Crash-free users rate (target: >99.5%)
- Most common crash types
- Error frequency by iOS version

### Analytics
- Daily Active Users (DAU)
- Session length
- Retention (Day 1, Day 7, Day 30)
- Feature adoption rates
- Content consumption metrics

## Troubleshooting

### Common Issues

#### 1. Code Signing Errors
```
Error: "No signing certificate found"
Solution: Create iOS Distribution certificate in Apple Developer portal
```

#### 2. Provisioning Profile Mismatch
```
Error: "Provisioning profile doesn't match bundle identifier"
Solution: Ensure App Store provisioning profile uses tv.bayit.plus
```

#### 3. Upload Fails with Invalid Binary
```
Error: "Invalid Swift Support / Missing 64-bit support"
Solution:
- Ensure "Build Active Architecture Only" = NO in Release
- Verify "Valid Architectures" includes arm64
```

#### 4. TestFlight Processing Stuck
```
Status: "Processing" for >30 minutes
Solution:
- Wait 1-2 hours (Apple's processing can be slow)
- Check App Store Connect email for errors
- Verify all required icons are present
```

### Emergency Rollback

If critical issue discovered:
1. Remove build from TestFlight distribution
2. Notify all testers via TestFlight announcement
3. Fix issue and upload new build
4. Re-enable distribution once verified

## Next Steps After TestFlight

Once TestFlight beta is successful:
1. Submit for App Store Review
2. Prepare App Store metadata (screenshots, description, keywords)
3. Set release date or automatic release
4. Monitor reviews and ratings post-launch
5. Plan first update with user feedback

## Resources

- [App Store Connect](https://appstoreconnect.apple.com)
- [TestFlight Documentation](https://developer.apple.com/testflight/)
- [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Sentry Dashboard](https://sentry.io)
- Privacy Policy: https://bayit.tv/policy

## Contact

- Technical Lead: [Your Name]
- Apple Developer Team: [Team Name]
- Support Email: support@bayit.tv
