import BayitDesignSystem
import SwiftUI

/// Series detail screen with season picker, episode list, and related content
struct SeriesDetailView: View {
    @Environment(RepositoryProvider.self) private var repos
    @Environment(NavigationCoordinator.self) private var coordinator
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
            }
        }
        .background(DesignTokens.Background.primary)
        .navigationBarTitleDisplayMode(.inline)
        .task {
            if viewModel == nil {
                viewModel = SeriesDetailViewModel(
                    seriesId: seriesId,
                    repository: repos.series
                )
            }
            await viewModel?.loadDetail()
        }
    }

    private func detailContent(_ detail: SeriesDetail, vm: SeriesDetailViewModel) -> some View {
        LazyVStack(alignment: .leading, spacing: DesignTokens.Spacing.lg) {
            backdropSection(detail)
            metadataSection(detail)

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
                        Text("\(seasons) Seasons")
                            .font(.system(size: DesignTokens.FontSize.xs))
                            .foregroundColor(DesignTokens.Text.secondary)
                    }
                    if let episodes = detail.totalEpisodes {
                        Text("\(episodes) Episodes")
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
            if let description = detail.description {
                Text(description)
                    .font(.system(size: DesignTokens.FontSize.md))
                    .foregroundColor(DesignTokens.Text.secondary)
                    .lineSpacing(4)
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    private func seasonPicker(_ vm: SeriesDetailViewModel) -> some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: DesignTokens.Spacing.sm) {
                ForEach(vm.seasons) { season in
                    GlassChip(
                        title: "Season \(season.seasonNumber)",
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
                    EpisodeRow(episode: episode) {
                        coordinator.presentFullscreen(.player(
                            contentId: episode.id,
                            contentType: .episode
                        ))
                    }
                }
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    private func relatedSection(_ items: [RelatedItem]) -> some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
            Text("Related")
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
                            width: 120
                        ) {
                            coordinator.navigate(to: .seriesDetail(seriesId: item.id))
                        }
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
    let episode: EpisodeItem
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            HStack(spacing: DesignTokens.Spacing.md) {
                episodeThumbnail
                    .frame(width: 120, height: 68)
                    .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.sm))

                VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
                    if let number = episode.episodeNumber {
                        Text("Episode \(number)")
                            .font(.system(size: DesignTokens.FontSize.xs))
                            .foregroundColor(DesignTokens.Text.muted)
                    }

                    Text(episode.title ?? "Episode")
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

                Image(systemName: "play.circle.fill")
                    .font(.system(size: 28))
                    .foregroundColor(DesignTokens.Primary.default)
            }
            .padding(DesignTokens.Spacing.md)
            .glassCard()
        }
        .buttonStyle(.plain)
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
