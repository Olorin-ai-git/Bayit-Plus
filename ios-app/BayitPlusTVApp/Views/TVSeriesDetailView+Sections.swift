import BayitCore
import BayitDesignSystem
import BayitLocalization
import SwiftUI

// MARK: - Season Picker & Episodes

extension TVSeriesDetailView {
    func seasonPicker(_ vm: SeriesDetailViewModel) -> some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.lg) {
            Text(localization.t("content.seasons"))
                .font(.system(size: TVDesignTokens.FontSize.xxl, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)
                .padding(.horizontal, TVDesignTokens.Spacing.xxl)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: TVDesignTokens.Spacing.focusGap) {
                    ForEach(vm.seasons) { season in
                        GlassChip(
                            title: "\(localization.t("content.season")) \(season.seasonNumber)",
                            isSelected: vm.selectedSeason == season.seasonNumber,
                            onTap: {
                                Task {
                                    await vm.loadEpisodes(season: season.seasonNumber)
                                }
                            }
                        )
                        .tvFocusStyle()
                    }
                }
                .padding(.horizontal, TVDesignTokens.Spacing.xxl)
            }
        }
    }

    func episodeSection(_ vm: SeriesDetailViewModel, detail: SeriesDetail) -> some View {
        Group {
            if vm.isLoadingEpisodes {
                ProgressView()
                    .tint(DesignTokens.Primary.default)
                    .scaleEffect(1.5)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, TVDesignTokens.Spacing.xxl)
            } else if !vm.episodes.isEmpty {
                TVSeriesEpisodeListView(
                    episodes: vm.episodes,
                    seriesId: seriesId,
                    seriesRating: detail.rating
                )
            }
        }
    }
}

// MARK: - Related

extension TVSeriesDetailView {
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
                            title: item.title ?? localization.t("content.untitled"),
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
