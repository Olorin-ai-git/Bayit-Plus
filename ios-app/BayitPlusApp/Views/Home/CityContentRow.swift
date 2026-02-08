import BayitDesignSystem
import SwiftUI

/// City-specific content row (Tel Aviv, Jerusalem, etc.)
struct CityContentRow: View {
    let title: String
    let items: [CityContentItem]

    var body: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
            Text(title)
                .font(.system(size: DesignTokens.FontSize.lg, weight: .bold))
                .foregroundColor(DesignTokens.Text.primary)
                .padding(.horizontal, DesignTokens.Spacing.lg)

            GlassCarousel(items: items, itemWidth: 140) { item in
                GlassContentCard(
                    thumbnailURL: item.imageUrl,
                    title: item.title,
                    subtitle: citySubtitle(for: item),
                    badge: nil,
                    aspectRatio: 1.0,  // Square for news articles
                    width: 140
                ) {
                    // Open URL in web view or external browser
                    if let urlString = item.url, let url = URL(string: urlString) {
                        UIApplication.shared.open(url)
                    }
                }
            }
        }
    }

    private func citySubtitle(for item: CityContentItem) -> String? {
        var parts: [String] = []
        if let source = item.sourceName { parts.append(source) }
        if let category = item.category { parts.append(category) }
        return parts.isEmpty ? nil : parts.joined(separator: " | ")
    }
}
