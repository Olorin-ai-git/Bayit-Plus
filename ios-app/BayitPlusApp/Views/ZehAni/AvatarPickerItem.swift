import BayitDesignSystem
import SwiftUI

struct AvatarPickerItem: View {
    let avatar: StarStoryAvatar
    let isSelected: Bool
    let onSelect: () -> Void

    var body: some View {
        Button(action: onSelect) {
            VStack(spacing: DesignTokens.Spacing.xs) {
                avatarThumbnail
                    .frame(width: 56, height: 56)
                    .clipShape(Circle())
                    .overlay(
                        Circle()
                            .stroke(
                                isSelected
                                    ? DesignTokens.Primary.p400
                                    : DesignTokens.Glass.border,
                                lineWidth: isSelected ? 2.5 : 1
                            )
                    )

                Text(avatar.childFirstName)
                    .font(.system(
                        size: DesignTokens.FontSize.xs,
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
        .buttonStyle(.plain)
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
            .fill(DesignTokens.Glass.bg.opacity(0.3))
            .overlay {
                Text(String(avatar.childFirstName.prefix(1)).uppercased())
                    .font(.system(size: DesignTokens.FontSize.lg, weight: .bold))
                    .foregroundStyle(DesignTokens.Text.muted)
            }
    }
}
