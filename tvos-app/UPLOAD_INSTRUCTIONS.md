# Upload Bayit+ tvOS to App Store Connect

## 🎯 Recommended: Use Xcode Organizer

This is the easiest method if Transporter is not installed.

### Steps:

```bash
cd /Users/olorin/Documents/Projects/olorin/olorin-media/bayit-plus/tvos-app
open BayitPlusTVOS.xcarchive
```

Then in Xcode Organizer:
1. Click **"Distribute App"**
2. Select **"App Store Connect"** → Next
3. Select **"Upload"** → Next
4. Accept defaults → Next
5. Sign in if needed
6. Click **"Upload"**

---

## 📱 Alternative: Command Line Upload

### Option A: With Apple ID (Requires App-Specific Password)

**Step 1: Generate App-Specific Password**
1. Go to: https://appleid.apple.com
2. Sign in
3. Security → App-Specific Passwords
4. Click **"+"**
5. Label: "Bayit Upload"
6. Copy the generated password

**Step 2: Save to Keychain**
```bash
# Replace YOUR_APPLE_ID with your Apple ID email
xcrun altool --store-password-in-keychain-item "AC_PASSWORD" \
  -u "YOUR_APPLE_ID" \
  -p "your-app-specific-password"
```

**Step 3: Upload**
```bash
xcrun altool --upload-app \
  --type appletvos \
  --file Export/BayitPlusTVOS.ipa \
  --username "YOUR_APPLE_ID" \
  --password "@keychain:AC_PASSWORD"
```

---

### Option B: With API Key (Recommended for CI/CD)

**Step 1: Create API Key**
1. Go to: https://appstoreconnect.apple.com/access/api
2. Click **"+"** next to Keys
3. Name: "Bayit Upload Key"
4. Access: **Admin**
5. Click **"Generate"**
6. Download the .p8 file
7. Save to: `~/.appstoreconnect/private_keys/AuthKey_KEYID.p8`
8. Note your Key ID and Issuer ID

**Step 2: Upload**
```bash
xcrun altool --upload-app \
  --type appletvos \
  --file Export/BayitPlusTVOS.ipa \
  --apiKey YOUR_KEY_ID \
  --apiIssuer YOUR_ISSUER_ID
```

---

## ✅ After Upload

1. Wait 10-30 minutes for processing
2. Check email for "Build Processed" notification
3. Go to App Store Connect → TestFlight
4. Your build will appear there
5. Then go to tvOS App → Version 1.0 → Build
6. Select your uploaded build

---

## 🔍 Check Upload Status

```bash
# List recent builds
xcrun altool --list-apps \
  --apiKey YOUR_KEY_ID \
  --apiIssuer YOUR_ISSUER_ID
```

---

## 📦 Build Info

- **File**: Export/BayitPlusTVOS.ipa
- **Size**: 14 MB
- **Platform**: Apple tvOS
- **Version**: 1.0
- **Bundle ID**: Check your Xcode project

---

## ⚠️ Troubleshooting

### "Authentication failed"
- Verify Apple ID credentials
- Make sure you're using an App-Specific Password (not regular password)
- Try generating a new app-specific password

### "Invalid IPA"
- IPA must be exported with "App Store" distribution
- Check ExportOptions.plist shows correct provisioning

### "Build already exists"
- Increment build number in Xcode
- Archive again
- Export new IPA

---

## 💡 Pro Tip

Install Transporter from App Store (free) for the easiest upload experience:
https://apps.apple.com/us/app/transporter/id1450874784
