# dSYM Symbols and Crash Reporting

## Overview

Debug symbols (dSYMs) are used to symbolicate crash reports, making them readable with function names and line numbers instead of memory addresses.

## Firebase Crashlytics Integration

The Bayit+ iOS and tvOS apps use **Firebase Crashlytics** for crash reporting. Firebase handles dSYM upload automatically through its SDK integration.

### Why `uploadSymbols=false` in ExportOptions.plist

Our promote scripts set `uploadSymbols` to `false` because:

1. **Firebase handles its own symbolication** - The Firebase SDK automatically uploads dSYMs during the build process
2. **Prevents warnings** - Firebase/Google frameworks distributed via Swift Package Manager don't include dSYMs in the archive, causing warnings during App Store Connect upload
3. **No functionality loss** - Crash reports are still fully symbolicated through Firebase Crashlytics

### Frameworks Without dSYMs

The following frameworks show warnings but are handled by Firebase:
- `FirebaseAnalytics.framework`
- `GoogleAdsOnDeviceConversion.framework`
- `GoogleAppMeasurement.framework`
- `GoogleAppMeasurementIdentitySupport.framework`

## Verifying Crash Reporting Works

1. **Check Firebase Console**: Go to Firebase Console → Crashlytics
2. **Test crash**: Use the Firebase test crash button in app settings
3. **Verify symbolication**: Crash reports should show function names and line numbers

## Manual dSYM Upload (if needed)

If crash reports are not properly symbolicated:

1. Download dSYMs from App Store Connect:
   - Go to App Store Connect
   - Select your app → TestFlight or App Store
   - Click on build → Download dSYMs

2. Upload to Firebase:
   ```bash
   ./scripts/upload-symbols.sh /path/to/dSYMs BayitPlusApp/App/GoogleService-Info.plist
   ```

## Build Configuration

Our Release builds have:
- `DEBUG_INFORMATION_FORMAT = dwarf-with-dsym` - Generates dSYMs for our code
- `STRIP_INSTALLED_PRODUCT = YES` - Strips symbols from binary (reduces size)
- Firebase Crashlytics build phase - Automatically uploads dSYMs

## References

- [Firebase Crashlytics iOS Setup](https://firebase.google.com/docs/crashlytics/get-started?platform=ios)
- [Apple dSYM Documentation](https://developer.apple.com/documentation/xcode/building-your-app-to-include-debugging-information)
