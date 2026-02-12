# Add Missing Model Files to Xcode Project

The iOS/tvOS builds are failing because 3 model files exist on disk but are NOT added to the Xcode project.

## Files to Add

1. **BayitPlusApp/Models/AvatarMeshModels.swift**
   - Defines: MagicMirrorGreeting, MeshGlbUrl, AvatarMeshStatus
   - Needed by: AvatarMeshRepository.swift

2. **BayitPlusApp/Models/TalkBackModels.swift**
   - Defines: TalkBackPointsResponse, TalkBackEvaluation, TalkBackSubmitRequest, TalkBackStats, TalkBackHistoryResponse
   - Needed by: TalkBackRepository.swift

3. **BayitPlusApp/Views/ZehAni/BiometricConsentComponents.swift**
   - Defines: BiometricConsentStatus
   - Needed by: AvatarMeshRepository.swift

## Instructions

### Option 1: Drag & Drop in Xcode (Recommended)

1. **Open Xcode**
   ```bash
   open BayitPlus.xcodeproj
   ```

2. **In Finder**, navigate to:
   - `ios-app/BayitPlusApp/Models/`
   - Select: `AvatarMeshModels.swift` and `TalkBackModels.swift` (Cmd+Click both)

3. **In Xcode Project Navigator**:
   - Find the "Models" folder
   - Drag the 2 selected files from Finder into the Models folder in Xcode

4. **In the dialog that appears**:
   - ✓ **UNCHECK** "Copy items if needed"
   - ✓ **CHECK** "BayitPlusApp" under "Add to targets"
   - ✓ **CHECK** "BayitPlusTVApp" under "Add to targets"
   - ✓ Click "Finish"

5. **Repeat for BiometricConsentComponents.swift**:
   - Navigate in Finder to: `ios-app/BayitPlusApp/Views/ZehAni/`
   - Select: `BiometricConsentComponents.swift`
   - In Xcode, find "Views/ZehAni" folder
   - Drag file from Finder to Xcode
   - Same settings: UNCHECK copy, CHECK both targets

### Option 2: Right-Click Add Files

1. Open Xcode: `open BayitPlus.xcodeproj`
2. In Project Navigator, right-click on "Models" folder
3. Select "Add Files to 'BayitPlus'..."
4. Navigate to `BayitPlusApp/Models/`
5. Select both: `AvatarMeshModels.swift` and `TalkBackModels.swift`
6. Make sure:
   - "Copy items if needed" is **UNCHECKED**
   - "BayitPlusApp" target is **CHECKED**
   - "BayitPlusTVApp" target is **CHECKED**
7. Click "Add"
8. Repeat for `BiometricConsentComponents.swift` in the Views/ZehAni folder

## Verification

After adding the files, verify they appear in Xcode:

1. Select each file in Project Navigator
2. Check File Inspector (right sidebar)
3. Under "Target Membership", both targets should be checked:
   - [x] BayitPlusApp
   - [x] BayitPlusTVApp

Then test the build:
```bash
xcodebuild -project BayitPlus.xcodeproj -scheme BayitPlusApp -configuration Release -destination 'generic/platform=iOS' clean build | grep -E "(BUILD|error:)"
```

Should show: `** BUILD SUCCEEDED **`
