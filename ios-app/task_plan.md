# tvOS Profile Page - Production Ready Fix Plan

## Goal

Make every button on the tvOS Profile page fully functional end-to-end.

## Phases

### Phase 1: Quick Fixes (empty closures with existing destinations)

- [ ] Fix Widgets button (empty `{}` -> `onAction(.widgets)`)
- [ ] Wire Notifications -> existing preferences view (already has notifications toggle)
- **Status:** pending

### Phase 2: Localize All Hardcoded Strings

- [ ] TVAccountSettingsView.swift - 8+ hardcoded strings
- [ ] TVAccountSettingsView+Sections.swift - 12+ hardcoded strings
- [ ] Add missing keys to en.json localization file
- **Status:** pending

### Phase 3: Email & Phone Verification

- [ ] Wire "Verify Email" button -> POST /verification/email/send + show confirmation
- [ ] Create TVPhoneVerificationView (adapt from iOS PhoneVerificationView)
- [ ] Wire "Verify Phone" and "Add Phone Number" buttons
- **Status:** pending

### Phase 4: Password Management

- [ ] Create TVChangePasswordView using POST /password-reset/change
- [ ] Wire showingChangePassword state to sheet/fullScreenCover
- **Status:** pending

### Phase 5: Active Sessions / Devices

- [ ] Create TVActiveSessionsView using GET /devices + DELETE /devices/{id}
- [ ] Wire "Active Sessions" button
- **Status:** pending

### Phase 6: Passkeys (2FA)

- [ ] Create TVPasskeysView using GET /webauthn/credentials
- [ ] Wire "Two-Factor Authentication" button
- **Status:** pending

### Phase 7: Account Linking

- [ ] Create TVLinkAccountView using account linking endpoints
- [ ] Wire "Link Another Account" button
- **Status:** pending

### Phase 8: Household Profiles

- [ ] Create TVHouseholdProfilesView using household endpoints
- [ ] Wire "Household Profiles" button
- **Status:** pending

### Phase 9: About Screen

- [ ] Create TVAboutView with app info, version, legal links
- [ ] Wire "About" button
- **Status:** pending

### Phase 10: Danger Zone (Export & Delete)

- [ ] Wire "Export My Data" -> contact support flow (no backend endpoint yet)
- [ ] Create TVDeleteAccountView with confirmation using deleteAccount()
- [ ] Wire both buttons
- **Status:** pending

### Phase 11: Wire All New Views into Sheet Router

- [ ] Extend ProfileSheet enum with new cases
- [ ] Update TVProfileView+SheetRouter with new destinations
- [ ] Update TVProfileAccountSection + TVAccountSettingsView to route to new views
- **Status:** pending

## Backend Endpoints Available

- Email verify: POST /verification/email/send
- Phone verify: POST /verification/phone/send + /verify
- Password change: POST /password-reset/change
- Devices: GET /devices, DELETE /devices/{id}
- WebAuthn: GET /webauthn/credentials, DELETE /webauthn/credentials/{id}
- Account linking: GET /account/linked-providers, POST /account/link-provider
- Household: Full CRUD at /household/\*
- Delete account: UserRepository.deleteAccount() exists on iOS side
