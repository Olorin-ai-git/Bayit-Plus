#if os(tvOS)
    import BayitDesignSystem
    import SwiftUI

    struct TVAvatarPickerItem: View {
        let avatar: StarStoryAvatar
        let isSelected: Bool
        let onSelect: () -> Void

        var body: some View {
            Button(action: onSelect) {
                VStack(spacing: TVDesignTokens.Spacing.sm) {
                    avatarThumbnail
                        .frame(width: 100, height: 100)
                        .clipShape(Circle())
                        .overlay(
                            Circle()
                                .stroke(
                                    isSelected
                                        ? DesignTokens.Primary.p400
                                        : DesignTokens.Glass.border,
                                    lineWidth: isSelected ? 3 : 1
                                )
                        )

                    Text(avatar.childFirstName)
                        .font(.system(
                            size: TVDesignTokens.FontSize.sm,
                            weight: isSelected ? .bold : .regular
                        ))
                        .foregroundStyle(
                            isSelected
                                ? DesignTokens.Text.primary
                                : DesignTokens.Text.muted
                        )
                        .lineLimit(1)
                }
            }
            .tvCardStyle()
        }

        @ViewBuilder
        private var avatarThumbnail: some View {
            if let imageUrlString = avatar.creatifyAvatarImageUrl,
               let imageUrl = URL(string: imageUrlString)
            {
                CachedAsyncImage(url: imageUrl) { phase in
                    switch phase {
                    case let .success(image):
                        image.resizable().scaledToFill()
                    default:
                        placeholderCircle
                    }
                }
            } else {
                placeholderCircle
            }
        }

        private var placeholderCircle: some View {
            Circle()
                .fill(DesignTokens.Glass.bgMedium.opacity(0.3))
                .overlay {
                    Text(String(avatar.childFirstName.prefix(1)).uppercased())
                        .font(.system(size: TVDesignTokens.FontSize.xl, weight: .bold))
                        .foregroundStyle(DesignTokens.Text.muted)
                }
        }
    }
#endif
