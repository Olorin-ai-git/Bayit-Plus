import BayitCore
import BayitDesignSystem
import BayitLocalization
import SwiftUI

struct TVPodcastDetailView: View {
    @Environment(TVRepositoryProvider.self) var repos
    @Environment(TVNavigationCoordinator.self) var coordinator
    @Environment(TVAudioPlaybackManager.self) var audioManager
    @Environment(LocalizationManager.self) var localization
    @State var viewModel: PodcastDetailViewModel?

    let showId: String
    let logger = BayitLogger(category: "TVPodcastDetail")

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
                CachedAsyncImage(url: url) { phase in
                    switch phase {
                    case let .success(image):
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
                    Text(description.htmlStripped)
                        .font(.system(size: TVDesignTokens.FontSize.lg))
                        .foregroundStyle(DesignTokens.Text.secondary)
                        .lineLimit(6)
                        .lineSpacing(TVDesignTokens.Spacing.xs)
                        .frame(maxWidth: 900, alignment: .leading)
                }

                if let episodeCount = detail.episodeCount {
                    Text("\(episodeCount) \(localization.t("podcasts.episodes"))")
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
            Text(localization.t("podcasts.episodes"))
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
}
