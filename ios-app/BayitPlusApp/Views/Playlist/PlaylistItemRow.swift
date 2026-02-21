import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// A single playlist item row with thumbnail, title, duration,
/// and tap-to-play navigation.
struct PlaylistItemRow: View {
    let item: PlaylistItem
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            HStack(spacing: DesignTokens.Spacing.md) {
                thumbnailView(item.thumbnail)

                VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
                    Text(item.title ?? "")
                        .font(.system(
                            size: DesignTokens.FontSize.md,
                            weight: .medium
                        ))
                        .foregroundColor(DesignTokens.Text.primary)
                        .lineLimit(2)

                    if let duration = item.duration {
                        Text(duration)
                            .font(.system(size: DesignTokens.FontSize.sm))
                            .foregroundColor(DesignTokens.Text.secondary)
                    }
                }

                Spacer()
            }
            .padding(DesignTokens.Spacing.md)
            .background(DesignTokens.Glass.bg)
            .clipShape(
                RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
            )
            .overlay(
                RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
                    .stroke(DesignTokens.Glass.border, lineWidth: 1)
            )
        }
    }

    // MARK: - Thumbnail

    private func thumbnailView(_ url: String?) -> some View {
        Group {
            if let urlStr = url, let imageURL = URL(string: urlStr) {
                CachedAsyncImage(url: imageURL) { phase in
                    switch phase {
                    case let .success(image):
                        image.resizable().aspectRatio(contentMode: .fill)
                    default:
                        thumbnailPlaceholder
                    }
                }
            } else {
                thumbnailPlaceholder
            }
        }
        .frame(width: 100, height: 56)
        .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.sm))
    }

    private var thumbnailPlaceholder: some View {
        RoundedRectangle(cornerRadius: DesignTokens.Radius.sm)
            .fill(DesignTokens.Glass.bg)
    }
}

// MARK: - Playlist Empty State

struct PlaylistEmptyState: View {
    @Environment(LocalizationManager.self) private var localization

    var body: some View {
        VStack(spacing: DesignTokens.Spacing.lg) {
            Image(systemName: "list.bullet")
                .font(.system(size: 48))
                .foregroundColor(DesignTokens.Text.muted)

            Text(localization.t("playlist.empty"))
                .font(.system(size: DesignTokens.FontSize.md))
                .foregroundColor(DesignTokens.Text.secondary)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        .padding(.top, 120)
    }
}

// MARK: - Playlist Loading State

struct PlaylistLoadingList: View {
    var body: some View {
        VStack(spacing: DesignTokens.Spacing.sm) {
            ForEach(0 ..< 5, id: \.self) { _ in
                RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
                    .fill(DesignTokens.Glass.bg)
                    .frame(height: 80)
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
        .padding(.vertical, DesignTokens.Spacing.md)
    }
}
