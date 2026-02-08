import BayitDesignSystem
import SwiftUI

/// Culture content card with category badge, title, summary, tags, and relevance indicator
struct CultureCardView: View {
    let item: CultureItem
    let categoryColor: Color

    var body: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            // Category badge
            if let category = item.category {
                Text(category.uppercased())
                    .font(.system(size: DesignTokens.FontSize.xs, weight: .bold))
                    .foregroundColor(.white)
                    .padding(.horizontal, DesignTokens.Spacing.sm)
                    .padding(.vertical, 2)
                    .background(categoryColor)
                    .cornerRadius(DesignTokens.Radius.sm)
            }

            // Title
            Text(item.titleHe ?? item.title ?? "")
                .font(.system(size: DesignTokens.FontSize.md, weight: .semibold))
                .foregroundColor(DesignTokens.Text.primary)
                .lineLimit(2)

            // Source
            if let source = item.sourceName {
                Text(source)
                    .font(.system(size: DesignTokens.FontSize.xs))
                    .foregroundColor(DesignTokens.Text.muted)
                    .lineLimit(1)
            }

            // Tags
            if let tags = item.tags, !tags.isEmpty {
                tagsRow(tags)
            }

            // Relevance dots
            if let score = item.relevanceScore {
                relevanceDots(score: score)
            }
        }
        .padding(DesignTokens.Spacing.md)
        .glassCard()
    }

    private func tagsRow(_ tags: [String]) -> some View {
        HStack(spacing: DesignTokens.Spacing.xs) {
            ForEach(tags.prefix(3), id: \.self) { tag in
                Text(tag)
                    .font(.system(size: DesignTokens.FontSize.xs))
                    .foregroundColor(DesignTokens.Text.secondary)
                    .padding(.horizontal, DesignTokens.Spacing.xs)
                    .padding(.vertical, 1)
                    .background(DesignTokens.Glass.bg)
                    .cornerRadius(DesignTokens.Radius.sm)
            }
        }
    }

    private func relevanceDots(score: Double) -> some View {
        let filledCount = min(5, max(1, Int(score * 5)))
        return HStack(spacing: 3) {
            ForEach(0..<5, id: \.self) { index in
                Circle()
                    .fill(index < filledCount ? categoryColor : DesignTokens.Glass.bg)
                    .frame(width: 6, height: 6)
            }
        }
    }
}
