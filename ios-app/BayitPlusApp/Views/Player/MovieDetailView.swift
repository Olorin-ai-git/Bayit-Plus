import AVFoundation
import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Movie detail screen with backdrop, metadata, cast, and related content
struct MovieDetailView: View {
    @Environment(RepositoryProvider.self) var repos
    @Environment(NavigationCoordinator.self) var coordinator
    @Environment(LocalizationManager.self) var localization
    @Environment(DownloadManager.self) var downloadManager
    @State var viewModel: MovieDetailViewModel?
    @State var resolvedTrailerUrl: String?
    @State var showTrailer = false

    let movieId: String

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
        .fullScreenCover(isPresented: $showTrailer) {
            if let streamUrl = resolvedTrailerUrl {
                DirectTrailerPlayerView(
                    url: streamUrl,
                    onDismiss: { showTrailer = false }
                )
            }
        }
        .task {
            if viewModel == nil {
                viewModel = MovieDetailViewModel(
                    movieId: movieId,
                    repository: repos.content,
                    userRepository: repos.user
                )
            }
            await viewModel?.loadDetail()
        }
    }

    private func detailContent(_ detail: ContentDetail, vm: MovieDetailViewModel) -> some View {
        LazyVStack(alignment: .leading, spacing: DesignTokens.Spacing.lg) {
            backdropSection(detail)
            metadataSection(detail)
            actionButtons(detail)

            if let genre = detail.genre, !genre.isEmpty {
                genreChips(genre)
            }

            if let cast = detail.cast, !cast.isEmpty {
                castSection(cast)
            }

            if !vm.relatedItems.isEmpty {
                relatedSection(vm.relatedItems)
            }
        }
    }
}
