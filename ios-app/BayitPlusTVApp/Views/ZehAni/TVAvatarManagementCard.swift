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
            VStack(spacing: TVDesignTokens.Spacing.lg) {
                avatarImage
                    .frame(width: 160, height: 160)
                    .clipShape(Circle())
                    .overlay(
                        Circle().stroke(
                            avatar.isActiveAvatar
                                ? DesignTokens.Primary.p400
                                : DesignTokens.Glass.border,
                            lineWidth: avatar.isActiveAvatar ? 3 : 1
                        )
                    )
                    .shadow(
                        color: avatar.isActiveAvatar
                            ? DesignTokens.Glass.purpleGlow : .clear,
                        radius: 12
                    )

                VStack(spacing: TVDesignTokens.Spacing.xs) {
                    Text(avatar.childFirstName)
                        .font(.system(
                            size: TVDesignTokens.FontSize.xl, weight: .semibold
                        ))
                        .foregroundStyle(DesignTokens.Text.primary)

                    Text(avatar.style.displayName)
                        .font(.system(size: TVDesignTokens.FontSize.base))
                        .foregroundStyle(DesignTokens.Text.muted)

                    if avatar.isActiveAvatar {
                        Text(localization.t("zehAni.avatarManagement.active"))
                            .font(.system(
                                size: TVDesignTokens.FontSize.sm, weight: .bold
                            ))
                            .foregroundStyle(DesignTokens.Primary.p400)
                            .padding(.top, TVDesignTokens.Spacing.xs)
                    }
                }

                VStack(spacing: TVDesignTokens.Spacing.sm) {
                    if !avatar.isActiveAvatar {
                        Button {
                            onSetActive()
                        } label: {
                            Label(
                                localization.t(
                                    "zehAni.avatarManagement.setActive"
                                ),
                                systemImage: "checkmark.circle"
                            )
                            .font(.system(
                                size: TVDesignTokens.FontSize.base,
                                weight: .medium
                            ))
                            .foregroundStyle(DesignTokens.Text.primary)
                            .frame(minWidth: 200)
                            .padding(.vertical, TVDesignTokens.Spacing.sm)
                        }
                        .tvCardStyle()
                    }

                    Button {
                        onWardrobe()
                    } label: {
                        Label(
                            localization.t("wardrobe.title"),
                            systemImage: "tshirt"
                        )
                        .font(.system(
                            size: TVDesignTokens.FontSize.base,
                            weight: .medium
                        ))
                        .foregroundStyle(DesignTokens.Text.primary)
                        .frame(minWidth: 200)
                        .padding(.vertical, TVDesignTokens.Spacing.sm)
                    }
                    .tvCardStyle()

                    if canDelete {
                        Button {
                            onDelete()
                        } label: {
                            Label(
                                localization.t(
                                    "zehAni.avatarManagement.delete"
                                ),
                                systemImage: "trash"
                            )
                            .font(.system(
                                size: TVDesignTokens.FontSize.base,
                                weight: .medium
                            ))
                            .foregroundStyle(DesignTokens.ErrorColor.default)
                            .frame(minWidth: 200)
                            .padding(.vertical, TVDesignTokens.Spacing.sm)
                        }
                        .tvCardStyle()
                    }
                }
            }
            .padding(TVDesignTokens.Spacing.xl)
            .background(DesignTokens.Glass.bgMedium.opacity(0.3))
            .clipShape(
                RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg)
            )
            .overlay(
                RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg)
                    .stroke(
                        avatar.isActiveAvatar
                            ? DesignTokens.Primary.p400.opacity(0.3)
                            : DesignTokens.Glass.border,
                        lineWidth: 1
                    )
            )
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
                    Text(
                        String(avatar.childFirstName.prefix(1)).uppercased()
                    )
                    .font(.system(
                        size: TVDesignTokens.FontSize.xxl, weight: .bold
                    ))
                    .foregroundStyle(DesignTokens.Text.muted)
                }
        }
    }
#endif
