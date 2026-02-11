import BayitCore
import BayitDesignSystem
import SwiftUI

struct TVPodcastDetailView: View {
    @Environment(TVRepositoryProvider.self) private var repos
    @Environment(TVNavigationCoordinator.self) private var coordinator
    @State private var viewModel: PodcastDetailViewModel?

    let showId: String
    private let logger = BayitLogger(category: "TVPodcastDetail")

    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            if let vm = viewModel {
                if vm.isLoading && vm.detail == nil {
                    loadingState
                } else if let error = vm.error, vm.detail == nil {
                    tvErrorState(error) {
                        Task { await vm.load() }
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
                viewModel = PodcastDetailViewModel(
                    showId: showId,
                    repository: repos.podcasts
                )
            }
            await viewModel?.load()
        }
    }

    private func detailContent(_ detail: PodcastDetail, vm: PodcastDetailViewModel) -> some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.xxl) {
            showHeader(detail)
            episodeList(vm)
        }
        .padding(.top, TVDesignTokens.Spacing.xxl)
    }

    private func showHeader(_ detail: PodcastDetail) -> some View {
        HStack(alignment: .top, spacing: TVDesignTokens.Spacing.xxxl) {
            if let urlStr = detail.cover, let url = URL(string: urlStr) {
                AsyncImage(url: url) { phase in
                    switch phase {
                    case .success(let image):
                        image
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                    case .failure, .empty:
                        DesignTokens.Glass.bg
                    @unknown default:
                        DesignTokens.Glass.bg
                    }
                }
                .frame(width: 480, height: 480)
                .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.poster))
                .shadow(
                    color: .black.opacity(0.3),
                    radius: 16
                )
            }

            VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.lg) {
                Text(detail.title ?? "Untitled")
                    .font(.system(size: TVDesignTokens.FontSize.hero, weight: .bold))
                    .foregroundStyle(DesignTokens.Text.primary)

                if let author = detail.author {
                    Text(author)
                        .font(.system(size: TVDesignTokens.FontSize.xl, weight: .medium))
                        .foregroundStyle(DesignTokens.Text.secondary)
                }

                if let category = detail.category {
                    GlassChip(title: category, isSelected: false, onTap: {})
                }

                if let description = detail.description {
                    Text(description)
                        .font(.system(size: TVDesignTokens.FontSize.lg))
                        .foregroundStyle(DesignTokens.Text.secondary)
                        .lineLimit(6)
                        .lineSpacing(TVDesignTokens.Spacing.xs)
                        .frame(maxWidth: 900, alignment: .leading)
                }

                if let episodeCount = detail.episodeCount {
                    Text("\(episodeCount) Episodes")
                        .font(.system(size: TVDesignTokens.FontSize.md, weight: .medium))
                        .foregroundStyle(DesignTokens.Text.muted)
                }
            }
            .frame(maxWidth: 900, alignment: .leading)
        }
        .padding(.horizontal, TVDesignTokens.Spacing.xxl)
    }

    private func episodeList(_ vm: PodcastDetailViewModel) -> some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.lg) {
            Text("Episodes")
                .font(.system(size: TVDesignTokens.FontSize.xxl, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)
                .padding(.horizontal, TVDesignTokens.Spacing.xxl)

            VStack(spacing: TVDesignTokens.Spacing.focusGap) {
                ForEach(vm.episodes) { episode in
                    episodeRow(episode)
                        .onAppear {
                            if episode.id == vm.episodes.last?.id {
                                Task { await vm.loadMore() }
                            }
                        }
                }

                if vm.isLoadingMore {
                    ProgressView()
                        .tint(DesignTokens.Primary.default)
                        .scaleEffect(1.5)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, TVDesignTokens.Spacing.xl)
                }
            }
            .padding(.horizontal, TVDesignTokens.Spacing.xxl)
        }
    }

    private func episodeRow(_ episode: PodcastEpisodeItem) -> some View {
        GlassCard {
            HStack(spacing: TVDesignTokens.Spacing.lg) {
                if let urlStr = episode.thumbnail, let url = URL(string: urlStr) {
                    AsyncImage(url: url) { phase in
                        switch phase {
                        case .success(let image):
                            image
                                .resizable()
                                .aspectRatio(contentMode: .fill)
                        case .failure, .empty:
                            DesignTokens.Glass.bg
                        @unknown default:
                            DesignTokens.Glass.bg
                        }
                    }
                    .frame(width: 180, height: 180)
                    .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md))
                }

                VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.md) {
                    Text(episode.title ?? "Untitled Episode")
                        .font(.system(size: TVDesignTokens.FontSize.xl, weight: .semibold))
                        .foregroundStyle(DesignTokens.Text.primary)
                        .lineLimit(2)

                    if let description = episode.description {
                        Text(description)
                            .font(.system(size: TVDesignTokens.FontSize.md))
                            .foregroundStyle(DesignTokens.Text.secondary)
                            .lineLimit(3)
                    }

                    HStack(spacing: TVDesignTokens.Spacing.lg) {
                        if let duration = episode.duration {
                            Text(duration)
                                .font(.system(size: TVDesignTokens.FontSize.sm))
                                .foregroundStyle(DesignTokens.Text.muted)
                        }
                        if let publishedAt = episode.publishedAt {
                            Text(formatDate(publishedAt))
                                .font(.system(size: TVDesignTokens.FontSize.sm))
                                .foregroundStyle(DesignTokens.Text.muted)
                        }
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)

                GlassButton(
                    "Play",
                    variant: .secondary,
                    size: .medium,
                    action: {
                        logger.info("Playing podcast episode", context: [
                            "showId": showId,
                            "episodeId": episode.id
                        ])
                        coordinator.presentPlayer(
                            contentId: episode.id,
                            contentType: .podcast
                        )
                    }
                )
                .frame(width: 200)
            }
            .padding(TVDesignTokens.Spacing.lg)
        }
        .buttonStyle(.card)
        .tvFocusStyle()
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

    private func formatDate(_ dateString: String) -> String {
        let formatter = ISO8601DateFormatter()
        guard let date = formatter.date(from: dateString) else {
            return dateString
        }

        let displayFormatter = DateFormatter()
        displayFormatter.dateStyle = .medium
        return displayFormatter.string(from: date)
    }
}
