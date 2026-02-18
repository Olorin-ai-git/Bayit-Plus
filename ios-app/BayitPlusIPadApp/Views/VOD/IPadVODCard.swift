import BayitDesignSystem
import SwiftUI

/// Simplified VOD card for iPad 4-column grid
struct IPadVODCard: View {
    let item: ContentItem
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            VStack(alignment: .leading, spacing: 0) {
                posterImage
                    .aspectRatio(2 / 3, contentMode: .fit)
                    .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
                VStack(alignment: .leading, spacing: 2) {
                    Text(item.title ?? "Untitled")
                        .font(.system(size: DesignTokens.FontSize.sm, weight: .semibold))
                        .foregroundColor(DesignTokens.Text.primary)
                        .lineLimit(2)
                    if let year = item.year {
                        Text(String(year))
                            .font(.system(size: DesignTokens.FontSize.xs))
                            .foregroundColor(DesignTokens.Text.muted)
                            .lineLimit(1)
                    }
                }
                .padding(.top, DesignTokens.Spacing.xs)
            }
        }
        .buttonStyle(.plain)
    }

    @ViewBuilder
    private var posterImage: some View {
        if let urlStr = item.thumbnail, let url = URL(string: urlStr) {
            CachedAsyncImage(url: url) { placeholderPoster }
                .aspectRatio(contentMode: .fill)
        } else {
            placeholderPoster
        }
    }

    private var placeholderPoster: some View {
        ZStack {
            DesignTokens.Glass.bgMedium
            Image(systemName: "film")
                .font(.system(size: 28))
                .foregroundColor(DesignTokens.Text.muted)
        }
    }
}
