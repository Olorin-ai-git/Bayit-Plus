import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Card displaying a pending friend request with accept/reject actions.
struct FriendRequestCard: View {
    let request: FriendRequest
    let onAccept: () -> Void
    let onReject: () -> Void

    @Environment(\.localizationManager) private var localization

    var body: some View {
        GlassCard {
            VStack(spacing: DesignTokens.Spacing.sm) {
                UserAvatarRow(
                    name: request.senderName,
                    avatarURL: request.senderAvatar,
                    isOnline: nil
                )

                if let message = request.message {
                    Text(message)
                        .font(.system(size: DesignTokens.FontSize.sm))
                        .foregroundStyle(DesignTokens.Text.secondary)
                        .lineLimit(2)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }

                HStack(spacing: DesignTokens.Spacing.sm) {
                    GlassButton(
                        localization?.t("friends.accept") ?? "Accept",
                        variant: .primary,
                        size: .small,
                        action: onAccept
                    )
                    .accessibilityLabel("Accept friend request from \(request.senderName)")

                    GlassButton(
                        localization?.t("friends.reject") ?? "Reject",
                        variant: .secondary,
                        size: .small,
                        action: onReject
                    )
                    .accessibilityLabel("Reject friend request from \(request.senderName)")
                }
            }
        }
    }
}
