import BayitDesignSystem
import SwiftUI

/// Unified content card for all content types with consistent focus effects.
struct TVContentCard: View {
    let imageURL: String?
    let title: String
    let subtitle: String?
    let badge: String?
    let progress: Double?
    let aspectRatio: CGFloat
    let placeholderIcon: String
    let availableSubtitleLanguages: [String]?
    let onSelect: () -> Void

    @Environment(\.isFocused) private var isFocused

    /// Fixed card width matching special sections (360px)
    private let cardWidth: CGFloat = 360

    init(
        imageURL: String?,
        title: String,
        subtitle: String? = nil,
        badge: String? = nil,
        progress: Double? = nil,
        aspectRatio: CGFloat = 2.0 / 3.0,
        placeholderIcon: String = "photo",
        availableSubtitleLanguages: [String]? = nil,
        onSelect: @escaping () -> Void
    ) {
        self.imageURL = imageURL
        self.title = title
        self.subtitle = subtitle
        self.badge = badge
        self.progress = progress
        self.aspectRatio = aspectRatio
        self.placeholderIcon = placeholderIcon
        self.availableSubtitleLanguages = availableSubtitleLanguages
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
                    .overlay(alignment: .bottomLeading) {
                        subtitleFlagsOverlay
                    }
                    .overlay(alignment: .bottom) {
                        progressBarOverlay
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
        .focusEffectDisabled()
    }

    @ViewBuilder
    private var posterImage: some View {
        if let urlStr = imageURL, let url = URL(string: urlStr) {
            CachedAsyncImage(url: url) { phase in
                if case let .success(image) = phase {
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

    @ViewBuilder
    private var progressBarOverlay: some View {
        if let progress = progress, progress > 0 {
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    Rectangle()
                        .fill(Color.black.opacity(0.5))
                        .frame(height: 6)

                    Rectangle()
                        .fill(DesignTokens.Primary.default)
                        .frame(width: geo.size.width * CGFloat(min(progress / 100.0, 1.0)), height: 6)
                }
            }
            .frame(height: 6)
        }
    }

    @ViewBuilder
    private var subtitleFlagsOverlay: some View {
        if let languages = availableSubtitleLanguages, !languages.isEmpty {
            HStack(spacing: TVDesignTokens.Spacing.xxs) {
                ForEach(languages.prefix(5), id: \.self) { language in
                    Text(SubtitleLanguages.emojiFlag(for: language))
                        .font(.system(size: TVDesignTokens.FontSize.md))
                }
                if languages.count > 5 {
                    Text("+\(languages.count - 5)")
                        .font(.system(size: TVDesignTokens.FontSize.xs, weight: .medium))
                        .foregroundStyle(.white.opacity(0.8))
                }
            }
            .padding(.horizontal, TVDesignTokens.Spacing.sm)
            .padding(.vertical, TVDesignTokens.Spacing.xxs)
            .background(
                Capsule()
                    .fill(Color.black.opacity(0.7))
                    .overlay(
                        Capsule()
                            .strokeBorder(Color.white.opacity(0.2), lineWidth: 1)
                    )
            )
            .padding(TVDesignTokens.Spacing.sm)
        }
    }
}

/// Custom button style with focus effects for tvOS cards
private struct TVContentCardButtonStyle: ButtonStyle {
    @Environment(\.isFocused) private var isFocused

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .focusEffectDisabled()
            .scaleEffect(
                isFocused
                    ? TVDesignTokens.Focus.scaleAmount
                    : (configuration.isPressed ? 0.97 : 1.0)
            )
            .overlay(
                RoundedRectangle(cornerRadius: TVDesignTokens.Radius.poster)
                    .stroke(
                        isFocused ? DesignTokens.Glass.borderFocus : Color.clear,
                        lineWidth: TVDesignTokens.Focus.ringWidth
                    )
            )
            .shadow(
                color: isFocused
                    ? DesignTokens.Glass.purpleGlow : .clear,
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
