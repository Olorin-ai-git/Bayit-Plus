import BayitDesignSystem
import SwiftUI

/// Unified content card for all content types with consistent focus effects.
struct TVContentCard: View {
    let imageURL: String?
    let title: String
    let subtitle: String?
    let badge: String?
    let aspectRatio: CGFloat
    let placeholderIcon: String
    let onSelect: () -> Void

    @Environment(\.isFocused) private var isFocused

    /// Fixed card width matching special sections (360px)
    private let cardWidth: CGFloat = 360

    init(
        imageURL: String?,
        title: String,
        subtitle: String? = nil,
        badge: String? = nil,
        aspectRatio: CGFloat = 2.0/3.0,
        placeholderIcon: String = "photo",
        onSelect: @escaping () -> Void
    ) {
        self.imageURL = imageURL
        self.title = title
        self.subtitle = subtitle
        self.badge = badge
        self.aspectRatio = aspectRatio
        self.placeholderIcon = placeholderIcon
        self.onSelect = onSelect
    }

    var body: some View {
        Button(action: onSelect) {
            VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.sm) {
                // Thumbnail/poster
                posterImage
                    .frame(width: cardWidth)
                    .aspectRatio(aspectRatio, contentMode: .fit)
                    .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.poster))
                    .overlay(alignment: .topTrailing) {
                        badgeOverlay
                    }

                // Title
                Text(title)
                    .font(.system(size: TVDesignTokens.FontSize.md, weight: .semibold))
                    .foregroundStyle(DesignTokens.Text.primary)
                    .lineLimit(2)
                    .frame(width: cardWidth, alignment: .leading)

                // Subtitle
                if let subtitle = subtitle {
                    Text(subtitle)
                        .font(.system(size: TVDesignTokens.FontSize.sm))
                        .foregroundStyle(DesignTokens.Text.secondary)
                        .lineLimit(1)
                        .frame(width: cardWidth, alignment: .leading)
                }
            }
        }
        .buttonStyle(TVContentCardButtonStyle())
    }

    @ViewBuilder
    private var posterImage: some View {
        if let urlStr = imageURL, let url = URL(string: urlStr) {
            AsyncImage(url: url) { phase in
                if case .success(let image) = phase {
                    image
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                } else {
                    placeholderImage
                }
            }
        } else {
            placeholderImage
        }
    }

    private var placeholderImage: some View {
        ZStack {
            Rectangle()
                .fill(DesignTokens.Glass.bgStrong)

            Image(systemName: placeholderIcon)
                .font(.system(size: 48))
                .foregroundStyle(DesignTokens.Text.muted)
        }
        .aspectRatio(aspectRatio, contentMode: .fit)
    }

    @ViewBuilder
    private var badgeOverlay: some View {
        if let badge = badge {
            Text(badge)
                .font(.system(size: TVDesignTokens.FontSize.xs, weight: .bold))
                .foregroundStyle(.white)
                .padding(.horizontal, TVDesignTokens.Spacing.sm)
                .padding(.vertical, TVDesignTokens.Spacing.xxs)
                .background(DesignTokens.Primary.default.opacity(0.9))
                .clipShape(Capsule())
                .padding(TVDesignTokens.Spacing.sm)
        }
    }
}

/// Custom button style with focus effects for tvOS cards
private struct TVContentCardButtonStyle: ButtonStyle {
    @Environment(\.isFocused) private var isFocused

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(
                isFocused
                    ? TVDesignTokens.Focus.scaleAmount
                    : (configuration.isPressed ? 0.97 : 1.0)
            )
            .shadow(
                color: isFocused
                    ? DesignTokens.Glass.purpleGlow.opacity(0.5)
                    : .clear,
                radius: TVDesignTokens.Focus.shadowRadius,
                x: 0,
                y: isFocused ? 8 : 0
            )
            .animation(
                .spring(
                    duration: TVDesignTokens.Focus.animationDuration,
                    bounce: 0.2
                ),
                value: isFocused
            )
            .animation(.easeInOut(duration: 0.15), value: configuration.isPressed)
    }
}
