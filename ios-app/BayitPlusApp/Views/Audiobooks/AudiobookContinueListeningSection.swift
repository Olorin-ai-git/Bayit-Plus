import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Horizontal scroll showing audiobooks the user has started listening to.
/// Displays portrait cover art with progress bars for quick resume.
struct AudiobookContinueListeningSection: View {
    let items: [WatchHistoryItem]
    let onTap: (WatchHistoryItem) -> Void

    @Environment(LocalizationManager.self) private var localization

    var body: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            Text(localization.t("audiobooks.continueListening"))
                .font(.system(size: DesignTokens.FontSize.lg, weight: .bold))
                .foregroundColor(DesignTokens.Text.primary)
                .padding(.horizontal, DesignTokens.Spacing.lg)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: DesignTokens.Spacing.md) {
                    ForEach(items) { item in
                        AudiobookContinueCard(item: item) {
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

// MARK: - Card

private struct AudiobookContinueCard: View {
    let item: WatchHistoryItem
    let onTap: () -> Void

    private let cardWidth: CGFloat = 120

    var body: some View {
        Button(action: onTap) {
            VStack(alignment: .leading, spacing: 0) {
                coverImage
                    .frame(width: cardWidth, height: cardWidth * 1.5)
                    .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
                    .overlay(alignment: .center) {
                        Image(systemName: "play.circle.fill")
                            .font(.system(size: 32))
                            .foregroundColor(.white.opacity(0.9))
                            .shadow(radius: 4)
                    }
                    .overlay(alignment: .bottom) {
                        progressBar
                    }

                Text(item.title ?? "")
                    .font(.system(size: DesignTokens.FontSize.xs, weight: .medium))
                    .foregroundColor(DesignTokens.Text.primary)
                    .lineLimit(2)
                    .frame(width: cardWidth, alignment: .leading)
                    .padding(.top, DesignTokens.Spacing.xs)

                if let duration = item.duration, let position = item.position {
                    let remaining = max(duration - position, 0)
                    let minutes = Int(remaining / 60)
                    Text(minutes > 60
                        ? "\(minutes / 60)h \(minutes % 60)m left"
                        : "\(minutes)m left")
                        .font(.system(size: DesignTokens.FontSize.xs))
                        .foregroundColor(DesignTokens.Text.muted)
                        .lineLimit(1)
                        .frame(width: cardWidth, alignment: .leading)
                }
            }
        }
        .buttonStyle(.plain)
    }

    // MARK: - Thumbnail

    @ViewBuilder
    private var coverImage: some View {
        if let urlStr = item.thumbnail, let url = URL(string: urlStr) {
            CachedAsyncImage(url: url) { phase in
                switch phase {
                case let .success(img):
                    img.resizable().aspectRatio(contentMode: .fill)
                default:
                    coverPlaceholder
                }
            }
        } else {
            coverPlaceholder
        }
    }

    private var coverPlaceholder: some View {
        ZStack {
            DesignTokens.Glass.bgMedium
            Image(systemName: "headphones")
                .font(.system(size: 28))
                .foregroundColor(DesignTokens.Text.muted)
        }
    }

    // MARK: - Progress

    private var progressBar: some View {
        GeometryReader { geometry in
            ZStack(alignment: .leading) {
                Rectangle()
                    .fill(Color.black.opacity(0.5))
                    .frame(height: 3)

                Rectangle()
                    .fill(DesignTokens.Primary.default)
                    .frame(width: geometry.size.width * progressFraction, height: 3)
            }
        }
        .frame(height: 3)
        .clipShape(RoundedRectangle(cornerRadius: 1.5))
    }

    private var progressFraction: CGFloat {
        guard let progress = item.progress, progress > 0 else { return 0 }
        return min(CGFloat(progress) / 100.0, 1.0)
    }
}
