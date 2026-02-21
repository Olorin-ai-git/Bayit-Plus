import BayitDesignSystem
import SwiftUI

/// Individual topic card matching the web CultureTrendingRow TopicCard design.
/// Extracted from TrendingRow.swift to keep each file under 200 lines.
struct TrendingTopicCard: View {
    let item: CultureTrendingItem

    var body: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            categoryHeader
            titleText
            summaryText
            Spacer(minLength: 0)
            bottomRow
        }
        .frame(width: 240, height: 180)
        .padding(DesignTokens.Spacing.base)
        .background(Color.white.opacity(0.08))
        .background(.ultraThinMaterial.opacity(0.5))
        .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.lg))
        .overlay(
            RoundedRectangle(cornerRadius: DesignTokens.Radius.lg)
                .stroke(Color.white.opacity(0.12), lineWidth: 0.5)
        )
    }

    private var categoryHeader: some View {
        HStack(spacing: DesignTokens.Spacing.sm) {
            Image(systemName: categoryIcon)
                .font(.system(size: DesignTokens.FontSize.xl))
                .foregroundColor(DesignTokens.Primary.p500)

            Text(item.category.capitalized)
                .font(.system(size: DesignTokens.FontSize.xs, weight: .semibold))
                .foregroundColor(DesignTokens.Primary.p500.opacity(0.9))
                .padding(.horizontal, DesignTokens.Spacing.sm)
                .padding(.vertical, 3)
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
            .font(.system(size: DesignTokens.FontSize.sm, weight: .bold))
            .foregroundColor(DesignTokens.Text.primary)
            .lineLimit(3)
            .lineSpacing(2)
    }

    @ViewBuilder
    private var summaryText: some View {
        if let summary = localizedSummary {
            Text(summary)
                .font(.system(size: DesignTokens.FontSize.xs))
                .foregroundColor(DesignTokens.Text.secondary)
                .lineLimit(2)
                .lineSpacing(1)
        }
    }

    private var bottomRow: some View {
        HStack {
            relevanceDots
            Spacer()
            if let source = item.sourceName {
                Text(source)
                    .font(.system(size: DesignTokens.FontSize.xs))
                    .foregroundColor(DesignTokens.Text.muted)
                    .lineLimit(1)
            }
        }
    }

    private var relevanceDots: some View {
        let score = item.relevanceScore ?? 0
        let activeDots = Int(ceil(score * 5))
        return HStack(spacing: 3) {
            ForEach(0 ..< 5, id: \.self) { index in
                Circle()
                    .fill(index < activeDots
                        ? DesignTokens.Primary.p500
                        : Color.white.opacity(0.2))
                    .frame(width: 6, height: 6)
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
