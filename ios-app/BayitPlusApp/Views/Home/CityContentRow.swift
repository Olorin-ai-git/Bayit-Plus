import BayitDesignSystem
import SwiftUI

/// City-specific content row with panoramic background image and glass carousel cards
struct CityContentRow: View {
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
        VStack(alignment: .leading, spacing: 0) {
            // Background image with content overlay
            GeometryReader { geo in
                ZStack(alignment: .topLeading) {
                    // Panoramic background - center-cropped for portrait
                    Image(backgroundImageName)
                        .resizable()
                        .scaledToFill()
                        .frame(width: geo.size.width, height: geo.size.height)
                        .clipped()

                    // Gradient overlay - stronger at top for header visibility
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

                    // Content overlaid on the background
                    VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
                        // City title
                        Text(title)
                            .font(.system(size: DesignTokens.FontSize.xl, weight: .bold))
                            .foregroundColor(.white)
                            .shadow(color: .black.opacity(0.6), radius: 3, x: 0, y: 1)
                            .padding(.horizontal, DesignTokens.Spacing.lg)
                            .padding(.top, DesignTokens.Spacing.lg)

                        // Subtitle
                        if !subtitle.isEmpty {
                            Text(subtitle)
                                .font(.system(size: DesignTokens.FontSize.sm))
                                .foregroundColor(.white.opacity(0.85))
                                .shadow(color: .black.opacity(0.5), radius: 2, x: 0, y: 1)
                                .padding(.horizontal, DesignTokens.Spacing.lg)
                        }

                        Spacer(minLength: DesignTokens.Spacing.sm)

                        // Glass carousel cards
                        GlassCarousel(items: items, itemWidth: 180) { item in
                            cityGlassCard(for: item)
                        }

                        // Sources footer
                        sourcesFooter
                            .padding(.horizontal, DesignTokens.Spacing.lg)
                            .padding(.bottom, DesignTokens.Spacing.md)
                    }
                }
            }
            .frame(height: 340)
            .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.lg))
            .overlay(
                RoundedRectangle(cornerRadius: DesignTokens.Radius.lg)
                    .stroke(Color.white.opacity(0.1), lineWidth: 1)
            )
        }
        .padding(.horizontal, DesignTokens.Spacing.md)
    }

    /// Glass-styled card for city content items
    private func cityGlassCard(for item: CityContentItem) -> some View {
        Button {
            if let urlString = item.url, let url = URL(string: urlString) {
                UIApplication.shared.open(url)
            }
        } label: {
            VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
                // Category badge
                if let category = item.category {
                    Text(category.uppercased())
                        .font(.system(size: DesignTokens.FontSize.xs, weight: .bold))
                        .foregroundColor(.white)
                        .padding(.horizontal, DesignTokens.Spacing.sm)
                        .padding(.vertical, 2)
                        .background(accentColor.opacity(0.7))
                        .clipShape(Capsule())
                }

                // Title
                Text(item.title ?? "")
                    .font(.system(size: DesignTokens.FontSize.md, weight: .semibold))
                    .foregroundColor(.white)
                    .lineLimit(3)
                    .multilineTextAlignment(.leading)
                    .shadow(color: .black.opacity(0.4), radius: 2, x: 0, y: 1)

                Spacer(minLength: 0)

                // Source label
                if let source = item.sourceName {
                    Text(source)
                        .font(.system(size: DesignTokens.FontSize.xs))
                        .foregroundColor(.white.opacity(0.6))
                        .lineLimit(1)
                }
            }
            .padding(DesignTokens.Spacing.md)
            .frame(width: 180, height: 160)
            .background(Color.white.opacity(0.08))
            .background(.ultraThinMaterial.opacity(0.5))
            .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
            .overlay(
                RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
                    .stroke(Color.white.opacity(0.12), lineWidth: 0.5)
            )
        }
        .buttonStyle(ScaleCityCardButtonStyle())
    }

    /// Unique source names from items
    private var sourcesFooter: some View {
        let sources = Set(items.compactMap(\.sourceName)).sorted()
        return Group {
            if !sources.isEmpty {
                Text("Sources: \(sources.joined(separator: ", "))")
                    .font(.system(size: DesignTokens.FontSize.xs))
                    .foregroundColor(.white.opacity(0.5))
                    .lineLimit(2)
            }
        }
    }
}

/// Scale animation for city glass cards
private struct ScaleCityCardButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? 0.95 : 1.0)
            .animation(.easeInOut(duration: 0.2), value: configuration.isPressed)
    }
}
