import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Individual city topic card matching the trending card style
struct TVCityTopicCard: View {
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
