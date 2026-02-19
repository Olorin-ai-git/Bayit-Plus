import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Series detail screen with season picker, episode list, and related content
struct SeriesDetailView: View {
    @Environment(RepositoryProvider.self) private var repos
    @Environment(NavigationCoordinator.self) private var coordinator
    @Environment(LocalizationManager.self) private var localization
    @Environment(DownloadManager.self) private var downloadManager
    @State private var viewModel: SeriesDetailViewModel?

    let seriesId: String

    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            if let vm = viewModel {
                if vm.isLoading && vm.detail == nil {
                    loadingState
                } else if let error = vm.error, vm.detail == nil {
                    ErrorStateView(message: error) {
                        Task { await vm.loadDetail() }
                    }
                } else if let detail = vm.detail {
                    detailContent(detail, vm: vm)
                }
            } else {
                ScreenLoadingView()
            }
        }
        .background(DesignTokens.Background.primary)
        .navigationBarTitleDisplayMode(.inline)
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
        LazyVStack(alignment: .leading, spacing: DesignTokens.Spacing.lg) {
            backdropSection(detail)
            metadataSection(detail)
            favoriteButton(vm)
            downloadAllButton(vm)

            if !vm.seasons.isEmpty {
                seasonPicker(vm)
            }

            episodeList(vm)

            if !vm.relatedItems.isEmpty {
                relatedSection(vm.relatedItems)
            }
        }
    }

    private func backdropSection(_ detail: SeriesDetail) -> some View {
        ZStack(alignment: .bottomLeading) {
            backdropImage(detail)
                .frame(height: 260)
                .clipped()

            LinearGradient(
                colors: [.clear, DesignTokens.Background.primary],
                startPoint: .center,
                endPoint: .bottom
            )

            VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
                Text(detail.title ?? "")
                    .font(.system(size: DesignTokens.FontSize.xxl, weight: .bold))
                    .foregroundColor(DesignTokens.Text.primary)

                HStack(spacing: DesignTokens.Spacing.md) {
                    if let year = detail.year {
                        Text(String(year))
                            .font(.system(size: DesignTokens.FontSize.xs))
                            .foregroundColor(DesignTokens.Text.secondary)
                    }
                    if let seasons = detail.totalSeasons {
                        Text("\(seasons) \(localization.t("player.seasons"))")
                            .font(.system(size: DesignTokens.FontSize.xs))
                            .foregroundColor(DesignTokens.Text.secondary)
                    }
                    if let episodes = detail.totalEpisodes {
                        Text("\(episodes) \(localization.t("player.episodes"))")
                            .font(.system(size: DesignTokens.FontSize.xs))
                            .foregroundColor(DesignTokens.Text.secondary)
                    }
                }
            }
            .padding(DesignTokens.Spacing.lg)
        }
    }

    private func backdropImage(_ detail: SeriesDetail) -> some View {
        Group {
            if let urlStr = detail.backdrop ?? detail.thumbnail,
               let url = URL(string: urlStr) {
                AsyncImage(url: url) { phase in
                    switch phase {
                    case .success(let img):
                        img.resizable().aspectRatio(contentMode: .fill)
                    default:
                        DesignTokens.Glass.bgMedium
                    }
                }
            } else {
                DesignTokens.Glass.bgMedium
            }
        }
        .frame(maxWidth: .infinity)
    }

    private func metadataSection(_ detail: SeriesDetail) -> some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            HStack(spacing: DesignTokens.Spacing.sm) {
                if let languages = detail.availableSubtitleLanguages, !languages.isEmpty {
                    SubtitleFlagsPill(
                        languages: languages,
                        aiLanguages: aiLanguages(for: languages),
                        size: .medium
                    )
                }

                if let rating = detail.ageRating ?? detail.rating, !rating.isEmpty {
                    Text(rating)
                        .font(.system(size: DesignTokens.FontSize.xs, weight: .bold))
                        .foregroundColor(DesignTokens.Text.primary)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 3)
                        .background(Color.black.opacity(0.7))
                        .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.sm))
                }
            }

            if let genre = detail.genre, !genre.isEmpty {
                genreChips(genre)
            }

            if let description = detail.description {
                Text(description)
                    .font(.system(size: DesignTokens.FontSize.md))
                    .foregroundColor(DesignTokens.Text.secondary)
                    .lineSpacing(4)
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    private func genreChips(_ genre: String) -> some View {
        let genres = genre.split(separator: ",").map { $0.trimmingCharacters(in: .whitespaces) }
        return ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: DesignTokens.Spacing.sm) {
                ForEach(genres, id: \.self) { g in
                    Text(g)
                        .font(.system(size: DesignTokens.FontSize.xs, weight: .medium))
                        .foregroundColor(DesignTokens.Text.primary)
                        .padding(.horizontal, DesignTokens.Spacing.md)
                        .padding(.vertical, DesignTokens.Spacing.xs)
                        .background(DesignTokens.Glass.bg)
                        .clipShape(Capsule())
                }
            }
        }
    }

    private func aiLanguages(for languages: [String]) -> Set<String> {
        var aiLangs = Set<String>()
        if languages.contains("he") { aiLangs.insert("he") }
        if languages.contains("en") { aiLangs.insert("en") }
        return aiLangs
    }

    private func favoriteButton(_ vm: SeriesDetailViewModel) -> some View {
        Button {
            Task { await vm.toggleFavorite() }
        } label: {
            HStack(spacing: DesignTokens.Spacing.sm) {
                Image(systemName: vm.isFavorite ? "heart.fill" : "heart")
                    .font(.system(size: 18))
                    .foregroundColor(
                        vm.isFavorite ? DesignTokens.Primary.default : DesignTokens.Text.secondary
                    )

                Text(localization.t(vm.isFavorite ? "favorites.remove" : "favorites.add"))
                    .font(.system(size: DesignTokens.FontSize.sm, weight: .medium))
                    .foregroundColor(DesignTokens.Text.primary)
            }
            .padding(.horizontal, DesignTokens.Spacing.lg)
            .padding(.vertical, DesignTokens.Spacing.sm)
            .background(DesignTokens.Glass.bg)
            .clipShape(Capsule())
        }
        .buttonStyle(.plain)
        .disabled(vm.isFavoriteLoading)
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    private func downloadAllButton(_ vm: SeriesDetailViewModel) -> some View {
        Button {
            let requests = vm.episodes.map { ep in
                DownloadRequest(
                    contentId: ep.id,
                    title: ep.title ?? localization.t("player.episode"),
                    thumbnail: ep.thumbnail,
                    contentType: .episode,
                    streamUrl: ep.directUrl ?? ep.streamUrl
                )
            }
            downloadManager.downloadAll(requests)
        } label: {
            HStack(spacing: DesignTokens.Spacing.sm) {
                Image(systemName: "arrow.down.circle")
                    .font(.system(size: 16))
                Text(localization.t("downloads.downloadAll"))
                    .font(.system(size: DesignTokens.FontSize.sm, weight: .medium))
            }
            .foregroundColor(DesignTokens.Text.primary)
            .padding(.horizontal, DesignTokens.Spacing.lg)
            .padding(.vertical, DesignTokens.Spacing.sm)
            .background(DesignTokens.Glass.bg)
            .clipShape(Capsule())
        }
        .buttonStyle(.plain)
        .disabled(vm.episodes.isEmpty)
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    private func seasonPicker(_ vm: SeriesDetailViewModel) -> some View {
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

    private func episodeList(_ vm: SeriesDetailViewModel) -> some View {
        VStack(spacing: DesignTokens.Spacing.md) {
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

    private func relatedSection(_ items: [RelatedItem]) -> some View {
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

    private var loadingState: some View {
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

/// Episode row card for the episode list
private struct EpisodeRow: View {
    @Environment(LocalizationManager.self) private var localization
    let episode: EpisodeItem
    let progress: Double?
    let downloadStatus: DownloadStatus?
    let onTap: () -> Void
    let onDownload: () -> Void

    var body: some View {
        Button(action: onTap) {
            VStack(spacing: 0) {
                HStack(spacing: DesignTokens.Spacing.md) {
                    ZStack(alignment: .center) {
                        episodeThumbnail
                            .frame(width: 120, height: 68)
                            .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.sm))

                        if progress != nil {
                            Image(systemName: "play.fill")
                                .font(.system(size: 20))
                                .foregroundColor(.white)
                                .shadow(color: .black.opacity(0.5), radius: 2)
                        }
                    }

                    VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
                        if let number = episode.episodeNumber {
                            Text("\(localization.t("player.episode")) \(number)")
                                .font(.system(size: DesignTokens.FontSize.xs))
                                .foregroundColor(DesignTokens.Text.muted)
                        }

                        Text(episode.title ?? localization.t("player.episode"))
                            .font(.system(size: DesignTokens.FontSize.md, weight: .semibold))
                            .foregroundColor(DesignTokens.Text.primary)
                            .lineLimit(2)

                        if let duration = episode.duration {
                            Text(duration)
                                .font(.system(size: DesignTokens.FontSize.xs))
                                .foregroundColor(DesignTokens.Text.muted)
                        }
                    }

                    Spacer()

                    HStack(spacing: DesignTokens.Spacing.sm) {
                        downloadIcon
                        Image(systemName: progress != nil ? "play.circle.fill" : "play.circle")
                            .font(.system(size: 28))
                            .foregroundColor(DesignTokens.Primary.default)
                    }
                }

                if let progress, progress > 0 {
                    GeometryReader { geo in
                        ZStack(alignment: .leading) {
                            RoundedRectangle(cornerRadius: 2)
                                .fill(DesignTokens.Glass.bg)
                                .frame(height: 3)

                            RoundedRectangle(cornerRadius: 2)
                                .fill(DesignTokens.Primary.default)
                                .frame(
                                    width: geo.size.width * min(progress, 1.0),
                                    height: 3
                                )
                        }
                    }
                    .frame(height: 3)
                    .padding(.top, DesignTokens.Spacing.xs)
                }
            }
            .padding(DesignTokens.Spacing.md)
            .glassCard()
        }
        .buttonStyle(.plain)
    }

    private var downloadIcon: some View {
        let isDownloaded = downloadStatus == .completed
        let isActive = downloadStatus == .downloading || downloadStatus == .queued || downloadStatus == .paused
        return Button(action: onDownload) {
            Image(systemName: isDownloaded ? "checkmark.circle.fill" : "arrow.down.circle")
                .font(.system(size: 22))
                .foregroundColor(isDownloaded ? .green : (isActive ? DesignTokens.Primary.default : DesignTokens.Text.muted))
        }
        .buttonStyle(.plain)
        .disabled(isActive || isDownloaded)
    }

    private var episodeThumbnail: some View {
        Group {
            if let urlStr = episode.thumbnail, let url = URL(string: urlStr) {
                AsyncImage(url: url) { phase in
                    switch phase {
                    case .success(let img):
                        img.resizable().aspectRatio(contentMode: .fill)
                    default:
                        DesignTokens.Glass.bgMedium
                    }
                }
            } else {
                DesignTokens.Glass.bgMedium
            }
        }
    }
}
