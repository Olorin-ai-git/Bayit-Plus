import BayitDesignSystem
import BayitLocalization
import SwiftUI

// MARK: - SeriesDetailView Season, Episode, and Related Sections

extension SeriesDetailView {
    func seasonPicker(_ vm: SeriesDetailViewModel) -> some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: DesignTokens.Spacing.sm) {
                ForEach(vm.seasons) { season in
                    GlassChip(
                        title: "\(localization.t("player.season")) \(season.seasonNumber)",
                        isSelected: vm.selectedSeason == season.seasonNumber
                    ) {
                        Task { await vm.loadEpisodes(season: season.seasonNumber) }
                    }
                }
            }
            .padding(.horizontal, DesignTokens.Spacing.lg)
        }
    }

    func episodeList(_ vm: SeriesDetailViewModel) -> some View {
        LazyVStack(spacing: DesignTokens.Spacing.md) {
            if vm.isLoadingEpisodes {
                ProgressView()
                    .tint(DesignTokens.Primary.default)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, DesignTokens.Spacing.xl)
            } else {
                ForEach(vm.episodes) { episode in
                    let dlStatus = downloadManager.downloads.first(where: { $0.contentId == episode.id })?.status
                    EpisodeRow(
                        episode: episode,
                        progress: vm.progress(for: episode.id),
                        downloadStatus: dlStatus
                    ) {
                        coordinator.presentFullscreen(.player(
                            contentId: episode.id,
                            contentType: .episode
                        ))
                    } onDownload: {
                        Task {
                            await downloadManager.startDownload(DownloadRequest(
                                contentId: episode.id,
                                title: episode.title ?? localization.t("player.episode"),
                                thumbnail: episode.thumbnail,
                                contentType: .episode,
                                streamUrl: episode.directUrl ?? episode.streamUrl
                            ))
                        }
                    }
                }
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    func relatedSection(_ items: [RelatedItem]) -> some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
            Text(localization.t("content.relatedContent"))
                .font(.system(size: DesignTokens.FontSize.lg, weight: .bold))
                .foregroundColor(DesignTokens.Text.primary)
                .padding(.horizontal, DesignTokens.Spacing.lg)

            ScrollView(.horizontal, showsIndicators: false) {
                LazyHStack(spacing: DesignTokens.Spacing.md) {
                    ForEach(items) { item in
                        GlassContentCard(
                            thumbnailURL: item.thumbnail,
                            title: item.title,
                            aspectRatio: 2 / 3,
                            width: 120,
                            placeholderIcon: .series,
                            onTap: {
                                coordinator.navigate(to: .seriesDetail(seriesId: item.id))
                            }
                        )
                    }
                }
                .padding(.horizontal, DesignTokens.Spacing.lg)
            }
        }
    }

    var loadingState: some View {
        VStack(spacing: DesignTokens.Spacing.lg) {
            RoundedRectangle(cornerRadius: 0)
                .fill(DesignTokens.Glass.bg)
                .frame(height: 260)
            RoundedRectangle(cornerRadius: DesignTokens.Radius.sm)
                .fill(DesignTokens.Glass.bg)
                .frame(height: 24)
                .padding(.horizontal, DesignTokens.Spacing.lg)
        }
    }
}
