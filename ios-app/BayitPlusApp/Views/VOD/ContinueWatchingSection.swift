import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Horizontal scrolling section showing content the user has started watching.
/// Shows progress bars and allows resuming from where the user left off.
struct ContinueWatchingSection: View {
    let items: [WatchHistoryItem]
    let onTap: (WatchHistoryItem) -> Void

    @Environment(LocalizationManager.self) private var localization

    var body: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            Text(localization.t("home.continueWatching"))
                .font(.system(
                    size: DesignTokens.FontSize.lg,
                    weight: .bold
                ))
                .foregroundColor(DesignTokens.Text.primary)
                .padding(.horizontal, DesignTokens.Spacing.lg)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: DesignTokens.Spacing.md) {
                    ForEach(items) { item in
                        ContinueWatchingCard(item: item) {
                            onTap(item)
                        }
                    }
                }
                .padding(.horizontal, DesignTokens.Spacing.lg)
            }
        }
        .padding(.vertical, DesignTokens.Spacing.sm)
    }
}

/// Individual continue watching card with thumbnail, title, and progress bar.
private struct ContinueWatchingCard: View {
    let item: WatchHistoryItem
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            VStack(alignment: .leading, spacing: 0) {
                ZStack(alignment: .bottomLeading) {
                    thumbnailImage
                        .frame(width: 160, height: 90)
                        .clipShape(
                            RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
                        )

                    // Play icon overlay
                    Image(systemName: "play.circle.fill")
                        .font(.system(size: 28))
                        .foregroundColor(.white.opacity(0.9))
                        .shadow(radius: 4)
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                }
                .frame(width: 160, height: 90)
                .overlay(alignment: .bottom) {
                    progressBar
                }

                Text(item.title ?? "")
                    .font(.system(
                        size: DesignTokens.FontSize.xs,
                        weight: .medium
                    ))
                    .foregroundColor(DesignTokens.Text.primary)
                    .lineLimit(1)
                    .frame(width: 160, alignment: .leading)
                    .padding(.top, DesignTokens.Spacing.xs)
            }
        }
        .buttonStyle(.plain)
    }

    @ViewBuilder
    private var thumbnailImage: some View {
        if let urlStr = item.thumbnail, let url = URL(string: urlStr) {
            AsyncImage(url: url) { phase in
                switch phase {
                case .success(let img):
                    img.resizable().aspectRatio(contentMode: .fill)
                default:
                    thumbnailPlaceholder
                }
            }
        } else {
            thumbnailPlaceholder
        }
    }

    private var thumbnailPlaceholder: some View {
        ZStack {
            DesignTokens.Glass.bgMedium
            Image(systemName: "film")
                .font(.system(size: 24))
                .foregroundColor(DesignTokens.Text.muted)
        }
    }

    private var progressBar: some View {
        GeometryReader { geometry in
            ZStack(alignment: .leading) {
                Rectangle()
                    .fill(Color.black.opacity(0.5))
                    .frame(height: 3)

                Rectangle()
                    .fill(DesignTokens.Primary.default)
                    .frame(
                        width: geometry.size.width * progressFraction,
                        height: 3
                    )
            }
        }
        .frame(height: 3)
        .clipShape(
            RoundedRectangle(cornerRadius: 1.5)
        )
    }

    private var progressFraction: CGFloat {
        guard let progress = item.progress, progress > 0 else { return 0 }
        return min(CGFloat(progress) / 100.0, 1.0)
    }
}
