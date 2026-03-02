# Chess Bug Fixes: Board Orientation + WhatsApp Invite Link

## Bug 1: Board always shows white at bottom

**Root cause**: `ChessBoardView` renders rows 0-7 top-to-bottom (FEN order), always placing white at the bottom. No flip logic exists.

**Fix**: Add `isFlipped` parameter to `ChessBoardView`. When the local player is black, flip both rendering order and tap coordinate mapping so black pieces appear at the bottom.

Files changed:

- `ChessViewModel.swift` - Add `localUserId`, `myColor`, `webHost` properties
- `ChessBoardView.swift` - Add `isFlipped` parameter, flip render + tap mapping
- `ChessView.swift` - Inject AuthManager, set localUserId/webHost, swap player bars
- `ChessView+Subviews.swift` - Move `openWhatsApp` helper here (line budget)

## Bug 2: WhatsApp invite link not clickable

**Root cause**: Link format is `bayitplus://chess/<code>` (custom URL scheme). WhatsApp does not make custom schemes clickable.

**Fix**: Change to `https://bayit.tv/chess/<code>` (universal link). The deep link router already handles `url.host == "bayit.tv"`.

Files changed:

- `ChessViewModel+Actions.swift` - Use `webHost` property for universal link URL
