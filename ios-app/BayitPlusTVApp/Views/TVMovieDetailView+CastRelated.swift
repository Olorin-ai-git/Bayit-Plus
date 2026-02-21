import BayitDesignSystem
import BayitLocalization
import SwiftUI

// MARK: - TVMovieDetailView + Cast & Related Sections

extension TVMovieDetailView {
    func castSection(_ cast: [String]) -> some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.lg) {
            Text(localization.t("content.cast"))
                .font(.system(size: TVDesignTokens.FontSize.xxl, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)
                .padding(.horizontal, TVDesignTokens.Spacing.xxl)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: TVDesignTokens.Spacing.focusGap) {
                    ForEach(cast, id: \.self) { member in
                        VStack(spacing: TVDesignTokens.Spacing.md) {
                            Circle()
                                .fill(DesignTokens.Glass.bg)
                                .frame(width: 180, height: 180)
                                .overlay(
                                    Text(String(member.prefix(1)))
                                        .font(.system(size: TVDesignTokens.FontSize.xxl, weight: .bold))
                                        .foregroundStyle(DesignTokens.Text.secondary)
                                )

                            Text(member)
                                .font(.system(size: TVDesignTokens.FontSize.md))
                                .foregroundStyle(DesignTokens.Text.primary)
                                .lineLimit(2)
                                .multilineTextAlignment(.center)
                                .frame(width: 180)
                        }
                    }
                }
                .padding(.horizontal, TVDesignTokens.Spacing.xxl)
            }
        }
    }

    func relatedSection(_ items: [RelatedItem]) -> some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.lg) {
            Text(localization.t("content.related"))
                .font(.system(size: TVDesignTokens.FontSize.xxl, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)
                .padding(.horizontal, TVDesignTokens.Spacing.xxl)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: TVDesignTokens.Spacing.focusGap) {
                    ForEach(items) { item in
                        GlassFocusPoster(
                            thumbnailURL: item.thumbnail,
                            title: item.title ?? "Untitled",
                            subtitle: relatedSubtitle(item),
                            aspectRatio: 2 / 3,
                            onSelect: {
                                logger.info("Selected related item", context: ["itemId": item.id])
                            }
                        )
                        .frame(width: 260)
                    }
                }
                .padding(.horizontal, TVDesignTokens.Spacing.xxl)
            }
        }
    }

    func relatedSubtitle(_ item: RelatedItem) -> String? {
        var parts: [String] = []
        if let year = item.year { parts.append(String(year)) }
        if let duration = item.duration { parts.append(duration) }
        return parts.isEmpty ? nil : parts.joined(separator: " | ")
    }
}
