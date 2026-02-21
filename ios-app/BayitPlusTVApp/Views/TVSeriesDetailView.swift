import BayitCore
import BayitDesignSystem
import BayitLocalization
import SwiftUI

struct TVSeriesDetailView: View {
    @Environment(TVRepositoryProvider.self) private var repos
    @Environment(TVNavigationCoordinator.self) private var coordinator
    @Environment(LocalizationManager.self) private var localization
    @Environment(DownloadManager.self) private var downloadManager
    @State private var viewModel: SeriesDetailViewModel?

    let seriesId: String
    private let logger = BayitLogger(category: "TVSeriesDetail")

    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            if let vm = viewModel {
                if vm.isLoading && vm.detail == nil {
                    loadingState
                } else if let error = vm.error, vm.detail == nil {
                    tvErrorState(error) {
                        Task { await vm.loadDetail() }
                    }
                } else if let detail = vm.detail {
                    detailContent(detail, vm: vm)
                }
            } else {
                loadingState
            }
        }
        .background(DesignTokens.Background.primary)
        .ignoresSafeArea()
        .task {
            if viewModel == nil {
                viewModel = SeriesDetailViewModel(
                    seriesId: seriesId,
                    repository: repos.series,
                    contentRepository: repos.content,
                    userRepository: repos.user
                )
            }
            await viewModel?.loadDetail()
        }
    }

    private func detailContent(_ detail: SeriesDetail, vm: SeriesDetailViewModel) -> some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.xxl) {
            backdropSection(detail)
            actionButtons(vm)
            descriptionSection(detail)

            if !vm.seasons.isEmpty {
                seasonPicker(vm)
            }

            episodeSection(vm, detail: detail)

            if !vm.relatedItems.isEmpty {
                relatedSection(vm.relatedItems)
            }
        }
    }

    private var loadingState: some View {
        VStack(spacing: TVDesignTokens.Spacing.xl) {
            ProgressView()
                .tint(DesignTokens.Primary.default)
                .scaleEffect(2.0)
        }
        .frame(maxWidth: .infinity)
        .padding(.top, TVDesignTokens.Spacing.xxxxl)
    }
}

// MARK: - Backdrop & Metadata

extension TVSeriesDetailView {
    private func backdropSection(_ detail: SeriesDetail) -> some View {
        ZStack(alignment: .bottomLeading) {
            if let urlStr = detail.backdrop ?? detail.thumbnail,
               let url = URL(string: urlStr)
            {
                AsyncImage(url: url) { phase in
                    if case let .success(image) = phase {
                        image.resizable().aspectRatio(contentMode: .fill)
                    } else {
                        DesignTokens.Glass.bg
                    }
                }
            } else {
                DesignTokens.Glass.bg
            }

            LinearGradient(
                colors: [.clear, DesignTokens.Background.primary],
                startPoint: .center,
                endPoint: .bottom
            )

            VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.md) {
                Text(detail.title ?? localization.t("content.untitled"))
                    .font(.system(size: TVDesignTokens.FontSize.hero, weight: .bold))
                    .foregroundStyle(DesignTokens.Text.primary)

                metadataBar(detail)
            }
            .padding(TVDesignTokens.Spacing.xxl)
        }
        .frame(height: 600)
        .clipped()
    }

    private func metadataBar(_ detail: SeriesDetail) -> some View {
        HStack(spacing: TVDesignTokens.Spacing.lg) {
            if let year = detail.year {
                Text(String(year))
                    .font(.system(size: TVDesignTokens.FontSize.md))
                    .foregroundStyle(DesignTokens.Text.secondary)
            }
            if let seasons = detail.totalSeasons {
                Text("\(seasons) \(localization.t("content.seasons"))")
                    .font(.system(size: TVDesignTokens.FontSize.md))
                    .foregroundStyle(DesignTokens.Text.secondary)
            }
            if let episodes = detail.totalEpisodes {
                Text("\(episodes) \(localization.t("content.episodes"))")
                    .font(.system(size: TVDesignTokens.FontSize.md))
                    .foregroundStyle(DesignTokens.Text.secondary)
            }
            if let rating = detail.rating {
                HStack(spacing: TVDesignTokens.Spacing.xs) {
                    Image(systemName: "star.fill")
                        .font(.system(size: TVDesignTokens.FontSize.sm))
                    Text(rating)
                        .font(.system(size: TVDesignTokens.FontSize.md))
                }
                .foregroundStyle(DesignTokens.Warning.default)
            }
        }
    }
}

// MARK: - Actions & Description

extension TVSeriesDetailView {
    private func actionButtons(_ vm: SeriesDetailViewModel) -> some View {
        HStack(spacing: TVDesignTokens.Spacing.xl) {
            if !vm.episodes.isEmpty {
                GlassButton(
                    localization.t("vod.collection.playAll"),
                    variant: .primary,
                    size: .large,
                    action: {
                        logger.info("Playing all series episodes", context: [
                            "seriesId": seriesId,
                            "episodeCount": String(vm.episodes.count),
                        ])
                        let sorted = vm.episodes.sorted {
                            ($0.episodeNumber ?? 0) < ($1.episodeNumber ?? 0)
                        }
                        guard let first = sorted.first else { return }
                        coordinator.presentPlayer(contentId: first.id, contentType: .vod)
                        let ids = sorted.map { $0.id }
                        Task { try? await repos.playlist.addBulkToPlaylist(contentIds: ids) }
                    }
                )
                .frame(width: 400)
                .buttonStyle(.card)
                .tvFocusStyle()
            }
        }
        .padding(.horizontal, TVDesignTokens.Spacing.xxl)
    }

    private func descriptionSection(_ detail: SeriesDetail) -> some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.md) {
            if let description = detail.description {
                Text(description)
                    .font(.system(size: TVDesignTokens.FontSize.lg))
                    .foregroundStyle(DesignTokens.Text.secondary)
                    .lineLimit(8)
                    .lineSpacing(TVDesignTokens.Spacing.xs)
            }
        }
        .padding(.horizontal, TVDesignTokens.Spacing.xxl)
        .frame(maxWidth: 1200, alignment: .leading)
    }
}

// MARK: - Season Picker & Episodes

extension TVSeriesDetailView {
    private func seasonPicker(_ vm: SeriesDetailViewModel) -> some View {
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

    private func episodeSection(_ vm: SeriesDetailViewModel, detail: SeriesDetail) -> some View {
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
    private func relatedSection(_ items: [RelatedItem]) -> some View {
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

    private func relatedSubtitle(_ item: RelatedItem) -> String? {
        var parts: [String] = []
        if let year = item.year { parts.append(String(year)) }
        if let duration = item.duration { parts.append(duration) }
        return parts.isEmpty ? nil : parts.joined(separator: " | ")
    }
}
