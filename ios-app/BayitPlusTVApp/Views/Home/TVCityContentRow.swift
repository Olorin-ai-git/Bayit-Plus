import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// City-specific content row for tvOS matching the trending section style.
/// Uses VStack with background image, fixed card row, and focus navigation.
struct TVCityContentRow: View {
    @Environment(LocalizationManager.self) private var localization

    let title: String
    let items: [CityContentItem]

    private static let maxVisibleCards = 4

    private var backgroundImageName: String {
        switch title {
        case "Jerusalem": return "Jerusalem"
        case "Tel Aviv": return "TelAviv"
        default: return "Jerusalem"
        }
    }

    private var subtitle: String {
        switch title {
        case "Jerusalem": return "Discover the eternal city"
        case "Tel Aviv": return "Experience the vibrant city"
        default: return ""
        }
    }

    private var accentColor: Color {
        switch title {
        case "Jerusalem": return DesignTokens.Primary.p400
        case "Tel Aviv": return .orange
        default: return DesignTokens.Primary.p400
        }
    }

    private var headerIcon: String {
        switch title {
        case "Jerusalem": return "building.columns.fill"
        case "Tel Aviv": return "building.2.fill"
        default: return "mappin.and.ellipse"
        }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.lg) {
            header
            cardsRow
            sourcesFooter
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, TVDesignTokens.Spacing.lg)
        .background {
            Canvas { context, size in
                let resolved = context.resolve(Image(backgroundImageName))
                let imgSize = resolved.size
                guard imgSize.width > 0, imgSize.height > 0 else { return }
                let scale = max(size.width / imgSize.width, size.height / imgSize.height)
                let w = imgSize.width * scale
                let h = imgSize.height * scale
                context.draw(resolved, in: CGRect(
                    x: (size.width - w) / 2,
                    y: (size.height - h) / 2,
                    width: w, height: h
                ))
            }
            .overlay {
                LinearGradient(
                    stops: [
                        .init(color: .black.opacity(0.5), location: 0),
                        .init(color: .black.opacity(0.2), location: 0.3),
                        .init(color: .black.opacity(0.4), location: 0.6),
                        .init(color: .black.opacity(0.75), location: 1.0),
                    ],
                    startPoint: .top,
                    endPoint: .bottom
                )
            }
        }
        .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.xl))
        .overlay(
            RoundedRectangle(cornerRadius: TVDesignTokens.Radius.xl)
                .stroke(Color.white.opacity(0.1), lineWidth: 2)
        )
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.sm) {
            HStack(spacing: TVDesignTokens.Spacing.md) {
                Text(title)
                    .font(.system(size: TVDesignTokens.FontSize.xxl, weight: .bold))
                    .foregroundColor(.white)
                    .shadow(color: .black.opacity(0.6), radius: 4, x: 0, y: 2)

                Image(systemName: headerIcon)
                    .font(.system(size: TVDesignTokens.FontSize.xxl))
                    .foregroundColor(accentColor)
                    .shadow(color: .black.opacity(0.5), radius: 3, x: 0, y: 2)
            }

            if !subtitle.isEmpty {
                Text(subtitle)
                    .font(.system(size: TVDesignTokens.FontSize.md))
                    .foregroundColor(.white.opacity(0.85))
                    .shadow(color: .black.opacity(0.5), radius: 3, x: 0, y: 1)
            }
        }
        .padding(.horizontal, TVDesignTokens.Spacing.xxl)
    }

    private var cardsRow: some View {
        HStack(spacing: TVDesignTokens.Spacing.focusGap) {
            ForEach(Array(items.prefix(Self.maxVisibleCards))) { item in
                Button {
                    // City news card tapped -- read-only
                } label: {
                    TVCityTopicCard(item: item, accentColor: accentColor)
                }
                .buttonStyle(.card)
                .tvFocusStyle()
            }
        }
        .padding(.horizontal, TVDesignTokens.Spacing.xxl)
        .padding(.vertical, TVDesignTokens.Spacing.md)
        .focusSection()
    }

    private var sourcesFooter: some View {
        let sources = Set(items.compactMap(\.sourceName)).sorted()
        return Group {
            if !sources.isEmpty {
                HStack(spacing: TVDesignTokens.Spacing.xs) {
                    Text(localization.t("trending.sources"))
                        .font(.system(size: TVDesignTokens.FontSize.sm))
                        .foregroundColor(DesignTokens.Text.muted)

                    Text(sources.joined(separator: ", "))
                        .font(.system(size: TVDesignTokens.FontSize.sm))
                        .foregroundColor(DesignTokens.Text.muted)
                        .lineLimit(1)
                }
                .padding(.horizontal, TVDesignTokens.Spacing.xxl)
            }
        }
    }
}

/// Individual city topic card matching the trending card style
private struct TVCityTopicCard: View {
    let item: CityContentItem
    let accentColor: Color

    var body: some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.sm) {
            categoryHeader
            titleText
            descriptionText
            Spacer(minLength: 0)
            bottomRow
        }
        .frame(width: 360, height: 280)
        .padding(TVDesignTokens.Spacing.lg)
        .background(Color.white.opacity(0.08))
        .background(.ultraThinMaterial.opacity(0.5))
        .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg))
        .overlay(
            RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg)
                .stroke(Color.white.opacity(0.12), lineWidth: 1)
        )
    }

    @ViewBuilder
    private var categoryHeader: some View {
        if let category = item.category {
            HStack(spacing: TVDesignTokens.Spacing.sm) {
                Image(systemName: categoryIcon)
                    .font(.system(size: TVDesignTokens.FontSize.xl))
                    .foregroundColor(accentColor)

                Text(category.capitalized)
                    .font(.system(size: TVDesignTokens.FontSize.sm, weight: .semibold))
                    .foregroundColor(accentColor.opacity(0.9))
                    .padding(.horizontal, TVDesignTokens.Spacing.md)
                    .padding(.vertical, TVDesignTokens.Spacing.xs)
                    .background(
                        Capsule()
                            .fill(accentColor.opacity(0.4))
                            .overlay(
                                Capsule()
                                    .strokeBorder(accentColor.opacity(0.6), lineWidth: 1)
                            )
                    )
            }
        }
    }

    private var titleText: some View {
        Text(item.title ?? "")
            .font(.system(size: TVDesignTokens.FontSize.md, weight: .bold))
            .foregroundColor(DesignTokens.Text.primary)
            .lineLimit(3)
            .lineSpacing(3)
    }

    @ViewBuilder
    private var descriptionText: some View {
        if let description = item.description, !description.isEmpty {
            Text(description)
                .font(.system(size: TVDesignTokens.FontSize.sm))
                .foregroundColor(DesignTokens.Text.secondary)
                .lineLimit(2)
                .lineSpacing(2)
        }
    }

    private var bottomRow: some View {
        HStack {
            Spacer()
            if let source = item.sourceName {
                Text(source)
                    .font(.system(size: TVDesignTokens.FontSize.sm))
                    .foregroundColor(DesignTokens.Text.muted)
                    .lineLimit(1)
            }
        }
    }

    private var categoryIcon: String {
        guard let category = item.category?.lowercased() else { return "newspaper" }
        switch category {
        case "security": return "lock.shield"
        case "politics": return "briefcase"
        case "tech", "technology": return "cpu"
        case "culture": return "music.note"
        case "sports": return "sportscourt"
        case "economy", "finance": return "chart.line.uptrend.xyaxis"
        case "entertainment": return "film"
        case "weather": return "cloud.rain"
        case "health": return "heart"
        case "food": return "cup.and.saucer"
        case "travel": return "map"
        case "history": return "book"
        case "expat", "diaspora": return "globe"
        default: return "newspaper"
        }
    }
}
