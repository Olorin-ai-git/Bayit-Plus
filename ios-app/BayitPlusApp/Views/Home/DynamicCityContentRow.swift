import BayitDesignSystem
import SwiftUI

/// Dynamic city content row for any culture city (beyond hardcoded Jerusalem/Tel Aviv).
/// Uses a generic gradient background since we don't have city-specific images for all cities.
struct DynamicCityContentRow: View {
    let cityName: String
    let items: [CultureItem]
    var accentColor: Color = DesignTokens.Primary.p400

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            GeometryReader { geo in
                ZStack(alignment: .topLeading) {
                    // Generic gradient background for dynamic cities
                    LinearGradient(
                        colors: [
                            accentColor.opacity(0.4),
                            accentColor.opacity(0.2),
                            DesignTokens.Background.primary.opacity(0.8)
                        ],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )

                    // Stronger overlay for text contrast
                    LinearGradient(
                        stops: [
                            .init(color: .black.opacity(0.4), location: 0),
                            .init(color: .black.opacity(0.2), location: 0.4),
                            .init(color: .black.opacity(0.5), location: 1.0)
                        ],
                        startPoint: .top,
                        endPoint: .bottom
                    )

                    // Content
                    VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
                        // City title
                        Text(cityName)
                            .font(.system(size: DesignTokens.FontSize.xl, weight: .bold))
                            .foregroundColor(.white)
                            .shadow(color: .black.opacity(0.6), radius: 3, x: 0, y: 1)
                            .padding(.horizontal, DesignTokens.Spacing.lg)
                            .padding(.top, DesignTokens.Spacing.lg)

                        Spacer(minLength: DesignTokens.Spacing.sm)

                        // Content carousel
                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: DesignTokens.Spacing.md) {
                                ForEach(items) { item in
                                    CultureCityCard(item: item)
                                }
                            }
                            .padding(.horizontal, DesignTokens.Spacing.lg)
                            .padding(.bottom, DesignTokens.Spacing.md)
                        }
                    }
                }
                .frame(width: geo.size.width, height: geo.size.height)
            }
        }
        .frame(height: 240)
        .clipped()
    }
}

/// Card for culture content items within dynamic city rows.
private struct CultureCityCard: View {
    let item: CultureItem

    var body: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
            if let imageUrl = item.imageUrl, let url = URL(string: imageUrl) {
                AsyncImage(url: url) { phase in
                    switch phase {
                    case .success(let image):
                        image
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                    default:
                        Color.gray.opacity(0.3)
                    }
                }
                .frame(width: 140, height: 100)
                .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
            }

            if let title = item.title {
                Text(title)
                    .font(.system(size: DesignTokens.FontSize.sm, weight: .medium))
                    .foregroundColor(.white)
                    .lineLimit(2)
                    .frame(width: 140, alignment: .leading)
            }

            if let category = item.category {
                Text(category.uppercased())
                    .font(.system(size: DesignTokens.FontSize.xs, weight: .semibold))
                    .foregroundColor(DesignTokens.Primary.p300)
                    .padding(.horizontal, DesignTokens.Spacing.xs)
                    .padding(.vertical, 2)
                    .background(DesignTokens.Glass.bgStrong)
                    .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.sm))
            }
        }
        .frame(width: 140)
    }
}
