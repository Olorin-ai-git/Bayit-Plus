import BayitDesignSystem
import SwiftUI

/// Location-based content row for tvOS (Israelis in City, Israeli Businesses)
/// Optimized for 10-foot UI with focus navigation
struct TVLocationContentRow: View {
    let title: String
    let items: [LocationItem]
    let coverage: Coverage?

    var body: some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.md) {
            titleWithLocation

            ScrollView(.horizontal, showsIndicators: false) {
                LazyHStack(spacing: TVDesignTokens.Spacing.focusGap) {
                    ForEach(items) { item in
                        GlassFocusPoster(
                            thumbnailURL: item.imageUrl,
                            title: item.title ?? "Untitled",
                            subtitle: locationSubtitle(for: item),
                            aspectRatio: 1.0  // Square
                        )
                        .frame(width: 280)
                        .tvFocusStyle()
                    }
                }
                .padding(.horizontal, TVDesignTokens.Spacing.xxl)
                .padding(.vertical, TVDesignTokens.Spacing.md)
            }
            .focusSection()
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.vertical, TVDesignTokens.Spacing.lg)
        .background(
            RoundedRectangle(cornerRadius: TVDesignTokens.Radius.xl)
                .fill(Color.white.opacity(0.04))
                .background(
                    RoundedRectangle(cornerRadius: TVDesignTokens.Radius.xl)
                        .fill(.ultraThinMaterial.opacity(0.2))
                )
        )
        .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.xl))
        .overlay(
            RoundedRectangle(cornerRadius: TVDesignTokens.Radius.xl)
                .stroke(Color.white.opacity(0.1), lineWidth: 2)
        )
        .padding(.horizontal, TVDesignTokens.Spacing.xxl)
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
        .padding(.horizontal, TVDesignTokens.Spacing.xxl)
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
