#if os(tvOS)
import SwiftUI

/// Content poster card for tvOS with focus scale and shadow.
/// Displays a thumbnail with overlaid title and optional badge.
/// Designed for use within GlassContentShelf rows.
public struct GlassFocusPoster: View {
    let thumbnailURL: String?
    let title: String
    let subtitle: String?
    let badge: String?
    let width: CGFloat
    let aspectRatio: CGFloat
    let onSelect: () -> Void

    @Environment(\.isFocused) private var isFocused

    public init(
        thumbnailURL: String?,
        title: String,
        subtitle: String? = nil,
        badge: String? = nil,
        width: CGFloat = TVDesignTokens.MinSize.posterWidth,
        aspectRatio: CGFloat = 2 / 3,
        onSelect: @escaping () -> Void = {}
    ) {
        self.thumbnailURL = thumbnailURL
        self.title = title
        self.subtitle = subtitle
        self.badge = badge
        self.width = width
        self.aspectRatio = aspectRatio
        self.onSelect = onSelect
    }

    public var body: some View {
        Button(action: onSelect) {
            ZStack(alignment: .bottom) {
                thumbnailImage
                    .frame(width: width)
                    .aspectRatio(aspectRatio, contentMode: .fill)
                    .clipped()

                metadataOverlay

                if let badge {
                    badgeOverlay(badge)
                }
            }
            .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.poster))
            .overlay(
                RoundedRectangle(cornerRadius: TVDesignTokens.Radius.poster)
                    .stroke(
                        isFocused
                            ? DesignTokens.Glass.borderFocus
                            : DesignTokens.Glass.border,
                        lineWidth: isFocused ? TVDesignTokens.Focus.ringWidth : 1
                    )
            )
        }
        .buttonStyle(TVPosterButtonStyle())
    }

    // MARK: - Subviews

    private var thumbnailImage: some View {
        Group {
            if let urlString = thumbnailURL, let url = URL(string: urlString) {
                AsyncImage(url: url) { phase in
                    switch phase {
                    case .success(let image):
                        image.resizable().aspectRatio(contentMode: .fill)
                    default:
                        placeholderGradient
                    }
                }
            } else {
                placeholderGradient
            }
        }
    }

    private var placeholderGradient: some View {
        LinearGradient(
            colors: [
                DesignTokens.Glass.purpleLight,
                DesignTokens.Glass.purpleStrong,
            ],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
    }

    private var metadataOverlay: some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.xxs) {
            Text(title)
                .font(.system(size: TVDesignTokens.FontSize.md, weight: .semibold))
                .foregroundStyle(DesignTokens.Text.primary)
                .lineLimit(2)

            if let subtitle {
                Text(subtitle)
                    .font(.system(size: TVDesignTokens.FontSize.sm))
                    .foregroundStyle(DesignTokens.Text.secondary)
                    .lineLimit(1)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(TVDesignTokens.Spacing.md)
        .background {
            LinearGradient(
                colors: [Color.clear, DesignTokens.Glass.bgStrong],
                startPoint: .top,
                endPoint: .bottom
            )
        }
    }

    private func badgeOverlay(_ text: String) -> some View {
        VStack {
            HStack {
                Spacer()
                Text(text.uppercased())
                    .font(.system(size: TVDesignTokens.FontSize.xs, weight: .bold))
                    .foregroundStyle(DesignTokens.Text.primary)
                    .padding(.horizontal, TVDesignTokens.Spacing.sm)
                    .padding(.vertical, TVDesignTokens.Spacing.xxs)
                    .background(
                        text.uppercased() == "LIVE"
                            ? DesignTokens.live.opacity(0.9)
                            : DesignTokens.Glass.bg
                    )
                    .clipShape(Capsule())
                    .padding(TVDesignTokens.Spacing.sm)
            }
            Spacer()
        }
    }
}

// MARK: - TV Poster Button Style

private struct TVPosterButtonStyle: ButtonStyle {
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
                    : Color.clear,
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
#endif
