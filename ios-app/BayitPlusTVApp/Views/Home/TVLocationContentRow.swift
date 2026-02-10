import BayitDesignSystem
import SwiftUI

/// Location-based content row for tvOS (Israelis in City, Israeli Businesses)
/// Optimized for 10-foot UI with focus navigation
struct TVLocationContentRow: View {
    let title: String
    let items: [LocationItem]
    let coverage: Coverage?

    var body: some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.lg) {
            titleWithLocation
                .padding(.horizontal, TVDesignTokens.Spacing.xxl)

            GlassContentShelf(title: "", items: items, itemWidth: 280) { item in
                GlassFocusPoster(
                    thumbnailURL: item.imageUrl,
                    title: item.title ?? "Untitled",
                    subtitle: locationSubtitle(for: item),
                    aspectRatio: 1.0  // Square
                )
            }
        }
    }

    private var titleWithLocation: some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.xs) {
            Text(title)
                .font(.system(size: TVDesignTokens.FontSize.xxl, weight: .bold))
                .foregroundColor(DesignTokens.Text.primary)

            if let coverage = coverage {
                if let nearestCity = coverage.nearestMajorCity, let distance = coverage.distanceMiles {
                    Text("Content from \(nearestCity) (\(String(format: "%.0f", distance)) miles away)")
                        .font(.system(size: TVDesignTokens.FontSize.sm))
                        .foregroundColor(DesignTokens.Text.muted)
                } else if coverage.contentSource == "local" {
                    Text("Near You")
                        .font(.system(size: TVDesignTokens.FontSize.sm))
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
