import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Detail screen for a podcast show displaying cover art, metadata, and episode list
struct PodcastDetailView: View {
    @Environment(RepositoryProvider.self) private var repos
    @Environment(LocalizationManager.self) private var localization
    @State private var viewModel: PodcastDetailViewModel?

    let showId: String

    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            if let vm = viewModel {
                if vm.isLoading && vm.detail == nil {
                    loadingState
                } else if let error = vm.error, vm.detail == nil {
                    ErrorStateView(message: error) {
                        Task { await vm.load() }
                    }
                } else if let detail = vm.detail {
                    detailContent(detail, vm: vm)
                } else {
                    emptyState
                }
            } else {
                ScreenLoadingView()
            }
        }
        .background(DesignTokens.Background.primary)
        .refreshable {
            await viewModel?.refresh()
        }
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
        VStack(spacing: DesignTokens.Spacing.lg) {
            coverSection(detail)
            metadataSection(detail)
            PodcastEpisodeListView(
                episodes: vm.episodes,
                isLoadingMore: vm.isLoadingMore,
                isRefreshing: vm.isLoading,
                onLoadMore: { await vm.loadMore() },
                onRefresh: { await vm.refreshLatestEpisodes() }
            )
        }
        .padding(.vertical, DesignTokens.Spacing.lg)
    }

    // MARK: - Cover

    private func coverSection(_ detail: PodcastDetail) -> some View {
        Group {
            if let urlStr = detail.cover, let url = URL(string: urlStr) {
                AsyncImage(url: url) { phase in
                    switch phase {
                    case .success(let img):
                        img.resizable()
                            .aspectRatio(contentMode: .fit)
                            .frame(maxWidth: 200)
                            .cornerRadius(DesignTokens.Radius.lg)
                            .shadow(radius: 10)
                    default:
                        coverPlaceholder
                    }
                }
            } else {
                coverPlaceholder
            }
        }
        .frame(maxWidth: .infinity)
        .accessibilityLabel(detail.title ?? "Podcast cover")
    }

    private var coverPlaceholder: some View {
        RoundedRectangle(cornerRadius: DesignTokens.Radius.lg)
            .fill(DesignTokens.Glass.bgMedium)
            .frame(width: 200, height: 200)
            .overlay {
                Image(systemName: "headphones")
                    .font(.system(size: 48))
                    .foregroundColor(DesignTokens.Text.muted)
            }
    }

    // MARK: - Metadata

    private func metadataSection(_ detail: PodcastDetail) -> some View {
        GlassCard {
            VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
                Text(detail.title ?? "")
                    .font(.system(size: DesignTokens.FontSize.xl, weight: .bold))
                    .foregroundColor(DesignTokens.Text.primary)
                    .accessibilityAddTraits(.isHeader)

                if let author = detail.author {
                    metadataRow(label: "Author", value: author)
                }

                if let category = detail.category {
                    metadataRow(label: "Category", value: category)
                }

                if let count = detail.episodeCount {
                    metadataRow(label: "Episodes", value: String(count))
                }

                if let description = detail.description {
                    Text(description.htmlStripped)
                        .font(.system(size: DesignTokens.FontSize.sm))
                        .foregroundColor(DesignTokens.Text.secondary)
                        .padding(.top, DesignTokens.Spacing.xs)
                }
            }
            .padding(DesignTokens.Spacing.lg)
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    private func metadataRow(label: String, value: String) -> some View {
        HStack {
            Text(label)
                .font(.system(size: DesignTokens.FontSize.sm))
                .foregroundColor(DesignTokens.Text.muted)
            Spacer()
            Text(value)
                .font(.system(size: DesignTokens.FontSize.sm))
                .foregroundColor(DesignTokens.Text.secondary)
        }
    }

    // MARK: - States

    private var emptyState: some View {
        VStack(spacing: DesignTokens.Spacing.lg) {
            Image(systemName: "headphones")
                .font(.system(size: 48))
                .foregroundColor(DesignTokens.Text.muted)

            Text(localization.t("podcasts.notFound"))
                .font(.system(size: DesignTokens.FontSize.md))
                .foregroundColor(DesignTokens.Text.secondary)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        .padding(.top, 120)
    }

    private var loadingState: some View {
        VStack(spacing: DesignTokens.Spacing.lg) {
            RoundedRectangle(cornerRadius: DesignTokens.Radius.lg)
                .fill(DesignTokens.Glass.bg)
                .frame(width: 200, height: 200)

            RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
                .fill(DesignTokens.Glass.bg)
                .frame(height: 120)
                .padding(.horizontal, DesignTokens.Spacing.lg)

            ForEach(0..<3, id: \.self) { _ in
                RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
                    .fill(DesignTokens.Glass.bg)
                    .frame(height: 70)
                    .padding(.horizontal, DesignTokens.Spacing.lg)
            }
        }
        .padding(.top, DesignTokens.Spacing.lg)
    }
}
