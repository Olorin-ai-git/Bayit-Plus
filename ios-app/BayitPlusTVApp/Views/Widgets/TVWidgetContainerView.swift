#if os(tvOS)
import BayitDesignSystem
import SwiftUI

/// Compact widget card for the tvOS sidebar. Shows content info, playback
/// controls, and minimize/close actions. Sized for a sidebar column.
struct TVWidgetContainerView: View {

    let widget: WidgetItem
    let onMinimize: () -> Void
    let onPlay: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.md) {
            headerRow
            contentPreview
            transportRow
        }
        .padding(TVDesignTokens.Spacing.lg)
        .background(DesignTokens.Glass.bgMedium)
        .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg))
        .overlay(
            RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg)
                .stroke(DesignTokens.Glass.border, lineWidth: 1)
        )
    }

    // MARK: - Header

    private var headerRow: some View {
        HStack(spacing: TVDesignTokens.Spacing.md) {
            Image(systemName: iconName)
                .font(.system(size: 20))
                .foregroundStyle(badgeColor)
                .frame(width: 36, height: 36)
                .background(badgeColor.opacity(0.15))
                .clipShape(Circle())

            VStack(alignment: .leading, spacing: 2) {
                Text(widget.title)
                    .font(.system(size: TVDesignTokens.FontSize.sm, weight: .semibold))
                    .foregroundStyle(DesignTokens.Text.primary)
                    .lineLimit(1)

                if let contentType = widget.content?.contentType {
                    Text(contentType.displayLabel)
                        .font(.system(size: TVDesignTokens.FontSize.xs))
                        .foregroundStyle(DesignTokens.Text.muted)
                }
            }

            Spacer()

            Button { onMinimize() } label: {
                Image(systemName: "arrow.down.right.and.arrow.up.left")
                    .font(.system(size: 14))
                    .foregroundStyle(DesignTokens.Text.secondary)
                    .frame(width: 32, height: 32)
                    .background(Color.white.opacity(0.08))
                    .clipShape(Circle())
            }
            .buttonStyle(.card)
            .accessibilityLabel("Minimize \(widget.title)")
        }
    }

    // MARK: - Content Preview

    @ViewBuilder
    private var contentPreview: some View {
        let contentType = widget.content?.contentType
        switch contentType {
        case .liveChannel, .live:
            livePreview
        case .radio:
            radioPreview
        case .podcast:
            podcastPreview
        case .vod:
            vodPreview
        case .audiobook:
            audiobookPreview
        case .iframe:
            iframePreview
        default:
            genericPreview
        }
    }

    private var livePreview: some View {
        HStack(spacing: TVDesignTokens.Spacing.sm) {
            coverThumbnail
            VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.xs) {
                HStack(spacing: 4) {
                    Circle().fill(Color.red).frame(width: 8, height: 8)
                    Text("LIVE")
                        .font(.system(size: TVDesignTokens.FontSize.xs, weight: .bold))
                        .foregroundStyle(Color.red)
                }
                Text(widget.description ?? "Live stream")
                    .font(.system(size: TVDesignTokens.FontSize.xs))
                    .foregroundStyle(DesignTokens.Text.secondary)
                    .lineLimit(2)
            }
            Spacer()
        }
    }

    private var radioPreview: some View {
        HStack(spacing: TVDesignTokens.Spacing.sm) {
            coverThumbnail
            VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.xs) {
                HStack(spacing: 4) {
                    Circle().fill(Color.red).frame(width: 6, height: 6)
                    Text("ON AIR")
                        .font(.system(size: 10, weight: .bold))
                        .foregroundStyle(Color.red)
                }
                Text(widget.description ?? "Radio station")
                    .font(.system(size: TVDesignTokens.FontSize.xs))
                    .foregroundStyle(DesignTokens.Text.secondary)
                    .lineLimit(2)
            }
            Spacer()
        }
    }

    private var podcastPreview: some View {
        HStack(spacing: TVDesignTokens.Spacing.sm) {
            coverThumbnail
            VStack(alignment: .leading) {
                Text(widget.description ?? "Podcast episode")
                    .font(.system(size: TVDesignTokens.FontSize.xs))
                    .foregroundStyle(DesignTokens.Text.secondary)
                    .lineLimit(2)
            }
            Spacer()
        }
    }

    private var vodPreview: some View {
        HStack(spacing: TVDesignTokens.Spacing.sm) {
            coverThumbnail
            VStack(alignment: .leading) {
                Text(widget.description ?? "Video content")
                    .font(.system(size: TVDesignTokens.FontSize.xs))
                    .foregroundStyle(DesignTokens.Text.secondary)
                    .lineLimit(2)
            }
            Spacer()
        }
    }

    private var audiobookPreview: some View {
        HStack(spacing: TVDesignTokens.Spacing.sm) {
            coverThumbnail
            VStack(alignment: .leading) {
                Text(widget.description ?? "Audiobook")
                    .font(.system(size: TVDesignTokens.FontSize.xs))
                    .foregroundStyle(DesignTokens.Text.secondary)
                    .lineLimit(2)
            }
            Spacer()
        }
    }

    private var iframePreview: some View {
        HStack(spacing: TVDesignTokens.Spacing.sm) {
            Image(systemName: "globe")
                .font(.system(size: 24))
                .foregroundStyle(DesignTokens.Text.muted)
                .frame(width: 48, height: 48)
                .background(Color.white.opacity(0.05))
                .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.sm))

            Text(widget.content?.iframeTitle ?? "Web content")
                .font(.system(size: TVDesignTokens.FontSize.xs))
                .foregroundStyle(DesignTokens.Text.secondary)
                .lineLimit(2)
            Spacer()
        }
    }

    private var genericPreview: some View {
        Text(widget.description ?? "")
            .font(.system(size: TVDesignTokens.FontSize.xs))
            .foregroundStyle(DesignTokens.Text.secondary)
            .lineLimit(2)
    }

    // MARK: - Transport

    private var transportRow: some View {
        Button { onPlay() } label: {
            HStack(spacing: TVDesignTokens.Spacing.md) {
                Image(systemName: "play.fill")
                    .font(.system(size: 16))
                Text("Play")
                    .font(.system(size: TVDesignTokens.FontSize.sm, weight: .medium))
            }
            .foregroundStyle(DesignTokens.Text.primary)
            .frame(maxWidth: .infinity)
            .frame(height: TVDesignTokens.MinSize.focusableHeight)
        }
        .buttonStyle(.card)
        .accessibilityLabel("Play \(widget.title)")
    }

    // MARK: - Helpers

    private var coverThumbnail: some View {
        Group {
            if let urlStr = widget.coverUrl, let url = URL(string: urlStr) {
                AsyncImage(url: url) { image in
                    image.resizable().aspectRatio(contentMode: .fill)
                } placeholder: {
                    fallbackThumbnail
                }
            } else {
                fallbackThumbnail
            }
        }
        .frame(width: 48, height: 48)
        .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.sm))
    }

    private var fallbackThumbnail: some View {
        ZStack {
            Color.white.opacity(0.05)
            Image(systemName: iconName)
                .font(.system(size: 20))
                .foregroundStyle(badgeColor)
        }
    }

    private var iconName: String {
        widget.content?.contentType?.iconName ?? "square.grid.2x2"
    }

    private var badgeColor: Color {
        switch widget.content?.contentType {
        case .liveChannel, .live: return DesignTokens.Primary.p400
        case .radio: return DesignTokens.Warning.default
        case .podcast: return DesignTokens.Success.default
        case .vod, .audiobook: return DesignTokens.Primary.p300
        case .iframe: return DesignTokens.Text.secondary
        default: return DesignTokens.Text.muted
        }
    }
}
#endif
