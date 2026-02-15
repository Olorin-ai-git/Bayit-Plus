import BayitDesignSystem
import BayitMedia
import SwiftUI

/// Hero carousel item with background image, gradient overlay, metadata,
/// subtitle flags pill, and a "Watch Now" button.
struct TVHeroItem: View {
    let item: SpotlightItem
    let onWatchNow: () -> Void

    var body: some View {
        ZStack(alignment: .bottomLeading) {
            // Background image - fills from top, clips overflow at bottom
            Color.clear
                .overlay(alignment: .top) {
                    if let urlStr = item.backdrop ?? item.thumbnail,
                       let url = URL(string: urlStr) {
                        AsyncImage(url: url) { phase in
                            if case .success(let img) = phase {
                                img.resizable()
                                    .aspectRatio(contentMode: .fill)
                            } else {
                                DesignTokens.Glass.purpleLight
                            }
                        }
                    } else {
                        DesignTokens.Glass.purpleLight
                    }
                }
                .clipped()

            // Full-width gradient overlay from bottom
            LinearGradient(
                stops: [
                    .init(color: .clear, location: 0.0),
                    .init(color: DesignTokens.Background.primary.opacity(0.3), location: 0.35),
                    .init(color: DesignTokens.Background.primary.opacity(0.8), location: 0.7),
                    .init(color: DesignTokens.Background.primary, location: 1.0)
                ],
                startPoint: .top,
                endPoint: .bottom
            )

            // Text content at bottom-left
            VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.sm) {
                Text(item.title ?? "")
                    .font(.system(size: TVDesignTokens.FontSize.xxl, weight: .bold))
                    .foregroundStyle(.white)
                    .shadow(color: .black.opacity(0.6), radius: 4, x: 0, y: 2)
                    .lineLimit(2)

                HStack(spacing: TVDesignTokens.Spacing.md) {
                    if let year = item.year {
                        metadataText(String(year))
                    }
                    if let duration = item.duration {
                        metadataText(duration)
                    }
                    if let rating = item.rating {
                        ratingBadge(rating.value)
                    }

                    // Subtitle emoji flags
                    if let languages = item.availableSubtitleLanguages,
                       !languages.isEmpty {
                        SubtitleFlagsPill(
                            languages: languages,
                            aiLanguages: [],
                            size: .medium
                        )
                    }
                }

                if let desc = item.description {
                    Text(desc)
                        .font(.system(size: TVDesignTokens.FontSize.sm))
                        .foregroundStyle(DesignTokens.Text.secondary)
                        .lineLimit(2)
                        .shadow(color: .black.opacity(0.5), radius: 3, x: 0, y: 1)
                }

                // Watch Now button
                Button(action: onWatchNow) {
                    HStack(spacing: TVDesignTokens.Spacing.sm) {
                        Image(systemName: "play.fill")
                            .font(.system(size: TVDesignTokens.FontSize.md))
                        Text("Watch Now")
                            .font(.system(size: TVDesignTokens.FontSize.md, weight: .semibold))
                    }
                    .foregroundStyle(.white)
                    .padding(.horizontal, TVDesignTokens.Spacing.xl)
                    .padding(.vertical, TVDesignTokens.Spacing.md)
                    .background(DesignTokens.Primary.default)
                    .clipShape(Capsule())
                }
                .buttonStyle(.plain)
                .padding(.top, TVDesignTokens.Spacing.sm)
            }
            .padding(.horizontal, TVDesignTokens.Spacing.xxl)
            .padding(.bottom, TVDesignTokens.Spacing.xl)
        }
    }

    private func metadataText(_ text: String) -> some View {
        Text(text)
            .font(.system(size: TVDesignTokens.FontSize.sm))
            .foregroundColor(DesignTokens.Text.secondary)
            .shadow(color: .black.opacity(0.5), radius: 3, x: 0, y: 1)
    }

    private func ratingBadge(_ text: String) -> some View {
        Text(text)
            .font(.system(size: TVDesignTokens.FontSize.xs, weight: .semibold))
            .foregroundColor(DesignTokens.Text.primary)
            .padding(.horizontal, TVDesignTokens.Spacing.sm)
            .padding(.vertical, TVDesignTokens.Spacing.xxs)
            .background(DesignTokens.Glass.bgStrong)
            .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.sm))
    }
}
