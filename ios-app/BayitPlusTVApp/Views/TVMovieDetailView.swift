import AVFoundation
import BayitCore
import BayitDesignSystem
import BayitLocalization
import BayitMedia
import SwiftUI

struct TVMovieDetailView: View {
    @Environment(TVRepositoryProvider.self) var repos
    @Environment(TVNavigationCoordinator.self) var coordinator
    @Environment(LocalizationManager.self) var localization
    @State var viewModel: MovieDetailViewModel?
    @State var trailerPlayer: AVPlayer?
    @State var showTrailer = false
    @State var showPlayer = false
    @State var resolvedTrailerUrl: String?

    let movieId: String
    let logger = BayitLogger(category: "TVMovieDetail")

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
                viewModel = MovieDetailViewModel(
                    movieId: movieId,
                    repository: repos.content,
                    userRepository: repos.user
                )
            }
            await viewModel?.loadDetail()
            setupTrailerPlayer()
        }
        .onDisappear {
            trailerPlayer?.pause()
            trailerPlayer = nil
        }
        .fullScreenCover(isPresented: $showTrailer) {
            if let streamUrl = resolvedTrailerUrl {
                TVDirectTrailerPlayerView(
                    url: streamUrl,
                    onDismiss: { showTrailer = false }
                )
            }
        }
        .fullScreenCover(isPresented: $showPlayer) {
            TVPlayerView(
                contentId: movieId,
                contentType: .vod,
                channelId: nil
            )
        }
    }

    private func detailContent(_ detail: ContentDetail, vm: MovieDetailViewModel) -> some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.xxl) {
            backdropSection(detail)
            actionButtons(detail, vm: vm)
            descriptionSection(detail)

            if let cast = detail.cast, !cast.isEmpty {
                castSection(cast)
            }

            if !vm.relatedItems.isEmpty {
                relatedSection(vm.relatedItems)
            }
        }
    }

    var loadingState: some View {
        VStack(spacing: TVDesignTokens.Spacing.xl) {
            ProgressView()
                .tint(DesignTokens.Primary.default)
                .scaleEffect(2.0)
        }
        .frame(maxWidth: .infinity)
        .padding(.top, TVDesignTokens.Spacing.xxxxl)
    }
}
