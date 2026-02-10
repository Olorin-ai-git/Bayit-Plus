import BayitDesignSystem
import SwiftUI

/// City-specific content row for tvOS with panoramic background and focus navigation
/// Optimized for 10-foot UI viewing
struct TVCityContentRow: View {
    let title: String
    let items: [CityContentItem]

    /// Background image name from asset catalog keyed by city title
    private var backgroundImageName: String {
        switch title {
        case "Jerusalem": return "Jerusalem"
        case "Tel Aviv": return "TelAviv"
        default: return "Jerusalem"
        }
    }

    /// Subtitle describing the city section
    private var subtitle: String {
        switch title {
        case "Jerusalem": return "Discover the eternal city"
        case "Tel Aviv": return "Experience the vibrant city"
        default: return ""
        }
    }

    /// Accent color per city
    private var accentColor: Color {
        switch title {
        case "Jerusalem": return DesignTokens.Primary.p400
        case "Tel Aviv": return .orange
        default: return DesignTokens.Primary.p400
        }
    }

    var body: some View {
        ZStack(alignment: .topLeading) {
            // Background: image + gradient (clipped to rounded rect)
            GeometryReader { geo in
                ZStack {
                    Image(backgroundImageName)
                        .resizable()
                        .scaledToFill()
                        .frame(width: geo.size.width, height: geo.size.height)
                        .clipped()

                    LinearGradient(
                        stops: [
                            .init(color: .black.opacity(0.55), location: 0),
                            .init(color: .black.opacity(0.25), location: 0.35),
                            .init(color: .black.opacity(0.45), location: 0.65),
                            .init(color: .black.opacity(0.8), location: 1.0)
                        ],
                        startPoint: .top,
                        endPoint: .bottom
                    )
                }
            }
            .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg))
            .overlay(
                RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg)
                    .stroke(Color.white.opacity(0.1), lineWidth: 2)
            )

            // Content overlaid without clipping for focus effects
            VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.lg) {
                Text(title)
                    .font(.system(size: TVDesignTokens.FontSize.xxl, weight: .bold))
                    .foregroundColor(.white)
                    .shadow(color: .black.opacity(0.6), radius: 4, x: 0, y: 2)
                    .padding(.horizontal, TVDesignTokens.Spacing.xxl)
                    .padding(.top, TVDesignTokens.Spacing.lg)

                if !subtitle.isEmpty {
                    Text(subtitle)
                        .font(.system(size: TVDesignTokens.FontSize.md))
                        .foregroundColor(.white.opacity(0.85))
                        .shadow(color: .black.opacity(0.5), radius: 3, x: 0, y: 1)
                        .padding(.horizontal, TVDesignTokens.Spacing.xxl)
                }

                Spacer(minLength: TVDesignTokens.Spacing.md)

                ScrollView(.horizontal, showsIndicators: false) {
                    LazyHStack(spacing: TVDesignTokens.Spacing.focusGap) {
                        ForEach(items) { item in
                            cityGlassCard(for: item)
                                .tvFocusStyle()
                        }
                    }
                    .padding(.horizontal, TVDesignTokens.Spacing.xxl)
                    .padding(.vertical, TVDesignTokens.Spacing.md)
                }

                sourcesFooter
                    .padding(.horizontal, TVDesignTokens.Spacing.xxl)
                    .padding(.bottom, TVDesignTokens.Spacing.lg)
            }
        }
        .frame(height: 500)
        .padding(.horizontal, TVDesignTokens.Spacing.xl)
    }

    /// Glass-styled card for city content items
    private func cityGlassCard(for item: CityContentItem) -> some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.sm) {
            // Category badge
            if let category = item.category {
                Text(category.uppercased())
                    .font(.system(size: TVDesignTokens.FontSize.sm, weight: .bold))
                    .foregroundColor(.white)
                    .padding(.horizontal, TVDesignTokens.Spacing.md)
                    .padding(.vertical, TVDesignTokens.Spacing.xs)
                    .background(accentColor.opacity(0.7))
                    .clipShape(Capsule())
            }

            // Title
            Text(item.title ?? "")
                .font(.system(size: TVDesignTokens.FontSize.md, weight: .semibold))
                .foregroundColor(.white)
                .lineLimit(3)
                .multilineTextAlignment(.leading)
                .shadow(color: .black.opacity(0.4), radius: 2, x: 0, y: 1)

            Spacer(minLength: 0)

            // Source label
            if let source = item.sourceName {
                Text(source)
                    .font(.system(size: TVDesignTokens.FontSize.sm))
                    .foregroundColor(.white.opacity(0.6))
                    .lineLimit(1)
            }
        }
        .padding(TVDesignTokens.Spacing.lg)
        .frame(width: 340, height: 360)
        .background(Color.white.opacity(0.08))
        .background(.ultraThinMaterial.opacity(0.5))
        .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md))
        .overlay(
            RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md)
                .stroke(Color.white.opacity(0.12), lineWidth: 1)
        )
    }

    /// Unique source names from items
    private var sourcesFooter: some View {
        let sources = Set(items.compactMap(\.sourceName)).sorted()
        return Group {
            if !sources.isEmpty {
                Text("Sources: \(sources.joined(separator: ", "))")
                    .font(.system(size: TVDesignTokens.FontSize.sm))
                    .foregroundColor(.white.opacity(0.5))
                    .lineLimit(2)
            }
        }
    }
}
