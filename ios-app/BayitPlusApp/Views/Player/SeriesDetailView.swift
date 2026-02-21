import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Series detail screen with season picker, episode list, and related content
struct SeriesDetailView: View {
    @Environment(RepositoryProvider.self) var repos
    @Environment(NavigationCoordinator.self) var coordinator
    @Environment(LocalizationManager.self) var localization
    @Environment(DownloadManager.self) var downloadManager
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
                    mediaRepository: repos.media,
                    userRepository: repos.user
                )
            }
            await viewModel?.loadDetail()
        }
    }

    func detailContent(_ detail: SeriesDetail, vm: SeriesDetailViewModel) -> some View {
        LazyVStack(alignment: .leading, spacing: DesignTokens.Spacing.lg) {
            backdropSection(detail)
            metadataSection(detail)
            favoriteButton(vm)

            if !vm.seasons.isEmpty {
                seasonPicker(vm)
            }

            episodeList(vm)

            if !vm.relatedItems.isEmpty {
                relatedSection(vm.relatedItems)
            }
        }
    }
}
