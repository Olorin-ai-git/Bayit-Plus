import BayitDesignSystem
import BayitLocalization
import SwiftUI

struct AvatarManagementCard: View {
    @Environment(LocalizationManager.self) var localization

    let avatar: StarStoryAvatar
    let canDelete: Bool
    let onSetActive: () -> Void
    let onDelete: () -> Void

    var body: some View {
        GlassCard {
            VStack(spacing: DesignTokens.Spacing.sm) {
                avatarImage
                    .frame(width: 80, height: 80)
                    .clipShape(Circle())
                    .overlay(
                        Circle().stroke(
                            avatar.isActiveAvatar
                                ? DesignTokens.Primary.p400
                                : DesignTokens.Glass.border,
                            lineWidth: avatar.isActiveAvatar ? 2.5 : 1
                        )
                    )

                Text(avatar.childFirstName)
                    .font(.system(size: DesignTokens.FontSize.md, weight: .semibold))
                    .foregroundStyle(DesignTokens.Text.primary)
                    .lineLimit(1)

                Text(avatar.style.displayName)
                    .font(.system(size: DesignTokens.FontSize.xs))
                    .foregroundStyle(DesignTokens.Text.muted)

                if avatar.isActiveAvatar {
                    Text(localization.t("zehAni.avatarManagement.active"))
                        .font(.system(size: DesignTokens.FontSize.xs, weight: .bold))
                        .foregroundStyle(DesignTokens.Primary.p400)
                }

                HStack(spacing: DesignTokens.Spacing.xs) {
                    if !avatar.isActiveAvatar {
                        GlassButton(
                            localization.t("zehAni.avatarManagement.setActive"),
                            variant: .primary,
                            size: .small
                        ) { onSetActive() }
                    }

                    if canDelete {
                        GlassButton(
                            localization.t("zehAni.avatarManagement.delete"),
                            variant: .secondary,
                            size: .small
                        ) { onDelete() }
                    }
                }
            }
        }
    }

    @ViewBuilder
    private var avatarImage: some View {
        if let imageUrlString = avatar.creatifyAvatarImageUrl,
           let imageUrl = URL(string: imageUrlString)
        {
            CachedAsyncImage(url: imageUrl) { phase in
                switch phase {
                case let .success(image):
                    image.resizable().scaledToFill()
                default:
                    avatarInitial
                }
            }
        } else {
            avatarInitial
        }
    }

    private var avatarInitial: some View {
        Circle()
            .fill(DesignTokens.Glass.bg.opacity(0.3))
            .overlay {
                Text(String(avatar.childFirstName.prefix(1)).uppercased())
                    .font(.system(size: DesignTokens.FontSize.xl, weight: .bold))
                    .foregroundStyle(DesignTokens.Text.muted)
            }
    }
}
