#if os(tvOS)
    import BayitDesignSystem
    import BayitLocalization
    import SwiftUI

    struct TVAvatarManagementCard: View {
        @Environment(LocalizationManager.self) var localization

        let avatar: StarStoryAvatar
        let canDelete: Bool
        let onSetActive: () -> Void
        let onDelete: () -> Void
        let onWardrobe: () -> Void

        var body: some View {
            VStack(spacing: TVDesignTokens.Spacing.md) {
                avatarImage
                    .frame(width: 120, height: 120)
                    .clipShape(Circle())
                    .overlay(
                        Circle().stroke(
                            avatar.isActiveAvatar
                                ? DesignTokens.Primary.p400
                                : DesignTokens.Glass.border,
                            lineWidth: avatar.isActiveAvatar ? 3 : 1
                        )
                    )

                Text(avatar.childFirstName)
                    .font(.system(size: TVDesignTokens.FontSize.lg, weight: .semibold))
                    .foregroundStyle(DesignTokens.Text.primary)

                Text(avatar.style.displayName)
                    .font(.system(size: TVDesignTokens.FontSize.sm))
                    .foregroundStyle(DesignTokens.Text.muted)

                if avatar.isActiveAvatar {
                    Text(localization.t("zehAni.avatarManagement.active"))
                        .font(.system(size: TVDesignTokens.FontSize.sm, weight: .bold))
                        .foregroundStyle(DesignTokens.Primary.p400)
                }

                HStack(spacing: TVDesignTokens.Spacing.sm) {
                    if !avatar.isActiveAvatar {
                        Button(localization.t("zehAni.avatarManagement.setActive")) {
                            onSetActive()
                        }
                        .tvCardStyle()
                    }

                    Button(localization.t("wardrobe.title")) {
                        onWardrobe()
                    }
                    .tvCardStyle()

                    if canDelete {
                        Button(localization.t("zehAni.avatarManagement.delete")) {
                            onDelete()
                        }
                        .tvCardStyle()
                    }
                }
            }
            .frame(height: 200)
            .frame(maxWidth: .infinity)
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
                .fill(DesignTokens.Glass.bgMedium.opacity(0.3))
                .overlay {
                    Text(String(avatar.childFirstName.prefix(1)).uppercased())
                        .font(.system(size: TVDesignTokens.FontSize.xxl, weight: .bold))
                        .foregroundStyle(DesignTokens.Text.muted)
                }
        }
    }
#endif
