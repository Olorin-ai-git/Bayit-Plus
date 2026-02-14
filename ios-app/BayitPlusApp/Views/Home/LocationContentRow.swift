import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Location-based content row (Israelis in City, Israeli Businesses)
struct LocationContentRow: View {
    @Environment(LocalizationManager.self) private var localization
    let title: String
    let items: [LocationItem]
    let coverage: Coverage?

    var body: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
            titleWithLocation
                .padding(.horizontal, DesignTokens.Spacing.lg)

            GlassCarousel(items: items, itemWidth: 160) { item in
                GlassContentCard(
                    thumbnailURL: item.imageUrl,
                    title: item.title,
                    subtitle: locationSubtitle(for: item),
                    badge: nil,
                    aspectRatio: 1.0,  // Square
                    width: 160
                ) {
                    // Open URL in web view or external browser
                    if let urlString = item.url, let url = URL(string: urlString) {
                        UIApplication.shared.open(url)
                    }
                }
            }
        }
    }

    private var titleWithLocation: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title)
                .font(.system(size: DesignTokens.FontSize.lg, weight: .bold))
                .foregroundColor(DesignTokens.Text.primary)

            if let coverage = coverage {
                if let nearestCity = coverage.nearestMajorCity, let distance = coverage.distanceMiles {
                    Text(localization.t("home.contentFromCity", ["city": nearestCity, "distance": String(format: "%.0f", distance)]))
                        .font(.system(size: DesignTokens.FontSize.xs))
                        .foregroundColor(DesignTokens.Text.muted)
                } else if coverage.contentSource == "local" {
                    Text(localization.t("home.nearYou"))
                        .font(.system(size: DesignTokens.FontSize.xs))
                        .foregroundColor(DesignTokens.Text.muted)
                }
            }
        }
    }

    private func locationSubtitle(for item: LocationItem) -> String? {
        var parts: [String] = []
        if let source = item.sourceName { parts.append(source) }
        if let city = item.city, let state = item.state {
            parts.append("\(city), \(state)")
        }
        return parts.isEmpty ? nil : parts.joined(separator: " | ")
    }
}
