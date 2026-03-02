import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Animated top-edge banner that appears when a chess invite is received.
struct ChessInviteBannerView: View {
    let invite: PendingChessInvite?
    let onAccept: (String) -> Void
    let onDecline: (String) -> Void

    @Environment(LocalizationManager.self) private var localization

    var body: some View {
        Group {
            if let invite {
                bannerContent(invite)
                    .transition(.move(edge: .top).combined(with: .opacity))
            }
        }
        .animation(.spring, value: invite != nil)
    }

    // MARK: - Banner Content

    private func bannerContent(_ invite: PendingChessInvite) -> some View {
        GlassCard {
            VStack(spacing: DesignTokens.Spacing.md) {
                Text(localization.t("chess.inviteReceived", ["name": invite.inviterName]))
                    .font(.system(size: DesignTokens.FontSize.sm, weight: .semibold))
                    .foregroundStyle(DesignTokens.Text.primary)
                    .multilineTextAlignment(.center)
                HStack(spacing: DesignTokens.Spacing.md) {
                    GlassButton(
                        localization.t("chess.declineInvite"),
                        variant: .secondary,
                        size: .small
                    ) {
                        onDecline(invite.gameCode)
                    }
                    GlassButton(
                        localization.t("chess.acceptInvite"),
                        variant: .primary,
                        size: .small
                    ) {
                        onAccept(invite.gameCode)
                    }
                }
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.base)
        .padding(.top, DesignTokens.Spacing.md)
    }
}
