# Chess Invite iOS Implementation Plan

## Steps

1. **3A** - Add `invitedUserId` and `inviteStatus` optional fields to `ChessGame.swift`
2. **3B** - Update `ChessRepository.swift`: change `invitePlayer` signature, add `getPendingInvites()` and `declineInvite(gameCode:)`
3. **3C** - Create `ChessInviteViewModel.swift` (~120 lines) with polling, accept, decline logic
4. **3D** - Create `ChessLobbyFriendPickerView.swift` (~120 lines) horizontal friend card picker
5. **3E** - Create `ChessInviteBannerView.swift` (~80 lines) animated overlay banner
6. **3F** - Update `ChessView.swift` to wire invite VM, banner overlay, friend loading
7. **3G** - Update `ChessLobbyView.swift` to include friend picker in PvP mode

## Key conventions discovered

- `BayitLogger(category:)` with `.info(msg, context:)` and `.error(msg, error:)`
- `@Observable` + `@MainActor` for ViewModels (NOT ObservableObject)
- `EmptyBody` from `BayitNetworking` (public, Encodable, Sendable)
- `APIClient` uses `.convertToSnakeCase` encoder and `.convertFromSnakeCase` decoder
- `Friend` model: `id`, `name`, `avatar`, `friendshipId`, `friendsSince`, `lastGameAt` (NOT displayName/avatarUrl/isOnline)
- `GlassButton(_ title, variant:, size:, action:)`, `GlassCard { content }`
- `localization.t("key")` or `localization.t("key", ["param": value])`
