import BayitDesignSystem
import SwiftUI

/// Trending culture news row for tvOS (What's Hot in Israel)
/// Optimized for 10-foot UI with focus navigation
struct TVTrendingRow: View {
    let items: [CultureTrendingItem]

    var body: some View {
        GeometryReader { geo in
            ZStack(alignment: .topLeading) {
                // Masada panoramic background
                Image("Masada")
                    .resizable()
                    .scaledToFill()
                    .frame(width: geo.size.width, height: geo.size.height)
                    .clipped()

                // Gradient overlay for readability
                LinearGradient(
                    stops: [
                        .init(color: .black.opacity(0.5), location: 0),
                        .init(color: .black.opacity(0.2), location: 0.3),
                        .init(color: .black.opacity(0.4), location: 0.6),
                        .init(color: .black.opacity(0.75), location: 1.0)
                    ],
                    startPoint: .top,
                    endPoint: .bottom
                )

                // Content overlay
                VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.lg) {
                    header
                    topicsCarousel
                    sourcesFooter
                }
                .padding(.vertical, TVDesignTokens.Spacing.lg)
            }
        }
        .frame(height: 500)
        .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.xl))
        .overlay(
            RoundedRectangle(cornerRadius: TVDesignTokens.Radius.xl)
                .stroke(Color.white.opacity(0.1), lineWidth: 2)
        )
        .padding(.horizontal, TVDesignTokens.Spacing.xl)
    }

    private var header: some View {
        HStack(spacing: TVDesignTokens.Spacing.md) {
            Text(localizedTitle)
                .font(.system(size: TVDesignTokens.FontSize.xxl, weight: .bold))
                .foregroundColor(.white)
                .shadow(color: .black.opacity(0.6), radius: 4, x: 0, y: 2)

            Image(systemName: "flame.fill")
                .font(.system(size: TVDesignTokens.FontSize.xxl))
                .foregroundColor(.orange)
                .shadow(color: .black.opacity(0.5), radius: 3, x: 0, y: 2)
        }
        .padding(.horizontal, TVDesignTokens.Spacing.xxl)
    }

    private var topicsCarousel: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            LazyHStack(spacing: TVDesignTokens.Spacing.focusGap) {
                ForEach(items) { item in
                    TVTrendingTopicCard(item: item)
                        .tvFocusStyle()
                }
            }
            .padding(.horizontal, TVDesignTokens.Spacing.xxl)
        }
    }

    private var sourcesFooter: some View {
        let sources = uniqueSources
        return Group {
            if !sources.isEmpty {
                HStack(spacing: TVDesignTokens.Spacing.xs) {
                    Text("Sources:")
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

    private var localizedTitle: String {
        let lang = Locale.current.language.languageCode?.identifier ?? "en"
        switch lang {
        case "he": return "מה חם בישראל"
        case "es": return "Lo popular en Israel"
        default: return "What's Hot in Israel"
        }
    }

    private var uniqueSources: [String] {
        let allSources = items.compactMap(\.sourceName)
        return Array(Set(allSources)).sorted()
    }
}

/// Individual topic card for tvOS with larger fonts and focus support
private struct TVTrendingTopicCard: View {
    let item: CultureTrendingItem

    var body: some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.sm) {
            categoryHeader
            titleText
            summaryText
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

    private var categoryHeader: some View {
        HStack(spacing: TVDesignTokens.Spacing.sm) {
            Image(systemName: categoryIcon)
                .font(.system(size: TVDesignTokens.FontSize.xl))
                .foregroundColor(DesignTokens.Primary.p500)

            Text(item.category.capitalized)
                .font(.system(size: TVDesignTokens.FontSize.sm, weight: .semibold))
                .foregroundColor(DesignTokens.Primary.p500.opacity(0.9))
                .padding(.horizontal, TVDesignTokens.Spacing.md)
                .padding(.vertical, TVDesignTokens.Spacing.xs)
                .background(
                    Capsule()
                        .fill(DesignTokens.Primary.p500.opacity(0.4))
                        .overlay(
                            Capsule()
                                .strokeBorder(DesignTokens.Primary.p500.opacity(0.6), lineWidth: 1)
                        )
                )
        }
    }

    private var titleText: some View {
        Text(localizedTitle)
            .font(.system(size: TVDesignTokens.FontSize.md, weight: .bold))
            .foregroundColor(DesignTokens.Text.primary)
            .lineLimit(3)
            .lineSpacing(3)
    }

    @ViewBuilder
    private var summaryText: some View {
        if let summary = localizedSummary {
            Text(summary)
                .font(.system(size: TVDesignTokens.FontSize.sm))
                .foregroundColor(DesignTokens.Text.secondary)
                .lineLimit(2)
                .lineSpacing(2)
        }
    }

    private var bottomRow: some View {
        HStack {
            relevanceDots
            Spacer()
            if let source = item.sourceName {
                Text(source)
                    .font(.system(size: TVDesignTokens.FontSize.sm))
                    .foregroundColor(DesignTokens.Text.muted)
                    .lineLimit(1)
            }
        }
    }

    private var relevanceDots: some View {
        let score = item.relevanceScore ?? 0
        let activeDots = Int(ceil(score * 5))
        return HStack(spacing: 6) {
            ForEach(0..<5, id: \.self) { index in
                Circle()
                    .fill(index < activeDots
                          ? DesignTokens.Primary.p500
                          : Color.white.opacity(0.2))
                    .frame(width: 10, height: 10)
            }
        }
    }

    private var localizedTitle: String {
        let lang = Locale.current.language.languageCode?.identifier ?? "en"
        if let localized = item.titleLocalized, let text = localized[lang], !text.isEmpty {
            return text
        }
        if let localized = item.titleLocalized, let enText = localized["en"], !enText.isEmpty {
            return enText
        }
        return item.title
    }

    private var localizedSummary: String? {
        let lang = Locale.current.language.languageCode?.identifier ?? "en"
        if let localized = item.summaryLocalized, let text = localized[lang], !text.isEmpty {
            return text
        }
        if let localized = item.summaryLocalized, let enText = localized["en"], !enText.isEmpty {
            return enText
        }
        return item.summary ?? item.summaryNative
    }

    private var categoryIcon: String {
        switch item.category.lowercased() {
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
