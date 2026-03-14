import BayitCore
import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Collection detail screen showing all movies in a collection with Play All functionality
struct CollectionDetailView: View {
    @Environment(RepositoryProvider.self) private var repos
    @Environment(NavigationCoordinator.self) private var coordinator
    @Environment(DownloadManager.self) private var downloadManager
    @Environment(LocalizationManager.self) private var localization
    @State private var viewModel: CollectionDetailViewModel?

    private let logger = BayitLogger(category: "CollectionDetail")
    let collectionId: String

    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            if let vm = viewModel {
                if vm.isLoading && vm.collection == nil {
                    ScreenLoadingView()
                } else if let error = vm.error, vm.collection == nil {
                    ErrorStateView(message: error) {
                        Task { await vm.loadCollection() }
                    }
                } else if let collection = vm.collection {
                    collectionContent(collection, vm)
                }
            } else {
                ScreenLoadingView()
            }
        }
        .background(DesignTokens.Background.primary)
        .navigationTitle(localization.t("vod.collection"))
        .navigationBarTitleDisplayMode(.inline)
        .task {
            if viewModel == nil {
                viewModel = CollectionDetailViewModel(
                    collectionId: collectionId,
                    repository: repos.content
                )
            }
            await viewModel?.loadCollection()
        }
    }

    private func collectionContent(_ collection: CollectionDetail, _: CollectionDetailViewModel) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            if let backdrop = collection.backdrop {
                backdropHero(backdrop, title: collection.localizedTitle(for: localization.currentLanguage.rawValue) ?? localization.t("home.collection"))
            }

            VStack(alignment: .leading, spacing: DesignTokens.Spacing.lg) {
                collectionHeader(collection)

                if let promoText = collection.localizedPromoText(for: localization.currentLanguage.rawValue) {
                    promoCard(promoText)
                }

                if let movies = collection.movies, !movies.isEmpty {
                    moviesSection(movies)
                }
            }
            .padding(.horizontal, DesignTokens.Spacing.lg)
            .padding(.vertical, DesignTokens.Spacing.md)
        }
    }

    private func backdropHero(_ backdropUrl: String, title _: String) -> some View {
        CachedAsyncImage(url: URL(string: backdropUrl)) { phase in
            switch phase {
            case let .success(image):
                image
                    .resizable()
                    .aspectRatio(contentMode: .fill)
                    .frame(height: 200)
                    .clipped()
            default:
                Rectangle()
                    .fill(DesignTokens.Glass.bgMedium)
                    .frame(height: 200)
            }
        }
        .overlay(alignment: .bottomLeading) {
            LinearGradient(
                colors: [.clear, DesignTokens.Background.primary.opacity(0.9)],
                startPoint: .top,
                endPoint: .bottom
            )
        }
    }

    private func collectionHeader(_ collection: CollectionDetail) -> some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            Text(collection.localizedTitle(for: localization.currentLanguage.rawValue) ?? localization.t("home.collection"))
                .font(.system(size: DesignTokens.FontSize.xxl, weight: .bold))
                .foregroundColor(DesignTokens.Text.primary)

            HStack(spacing: DesignTokens.Spacing.sm) {
                if let available = collection.availableMovies,
                   let total = collection.totalMovies
                {
                    Text(total > available ? "\(available) \(localization.t("vod.collection.of")) \(total) \(localization.t("vod.collection.movies"))" : "\(available) \(localization.t("vod.collection.movies"))")
                        .font(.system(size: DesignTokens.FontSize.md))
                        .foregroundColor(DesignTokens.Text.muted)
                }
            }

            if let movies = collection.movies, !movies.isEmpty {
                HStack(spacing: DesignTokens.Spacing.md) {
                    Button {
                        Task { await playAll(movies) }
                    } label: {
                        HStack {
                            Image(systemName: "play.fill")
                            Text(localization.t("vod.collection.playAll"))
                                .font(.system(size: DesignTokens.FontSize.md, weight: .semibold))
                        }
                        .foregroundColor(.white)
                        .padding(.horizontal, DesignTokens.Spacing.lg)
                        .padding(.vertical, DesignTokens.Spacing.md)
                        .background(DesignTokens.Primary.default)
                        .clipShape(Capsule())
                    }
                    .buttonStyle(.plain)

                    Button {
                        Task { await downloadAll(movies) }
                    } label: {
                        HStack {
                            Image(systemName: "arrow.down.circle")
                            Text(localization.t("downloads.downloadAll"))
                                .font(.system(size: DesignTokens.FontSize.md, weight: .semibold))
                        }
                        .foregroundColor(.white)
                        .padding(.horizontal, DesignTokens.Spacing.lg)
                        .padding(.vertical, DesignTokens.Spacing.md)
                        .background(DesignTokens.Glass.bgStrong)
                        .clipShape(Capsule())
                    }
                    .buttonStyle(.plain)
                }
                .padding(.top, DesignTokens.Spacing.sm)
            }
        }
    }

    private func promoCard(_ text: String) -> some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            HStack(spacing: DesignTokens.Spacing.xs) {
                Image(systemName: "sparkles")
                    .foregroundColor(DesignTokens.Primary.default)
                Text(localization.t("vod.collection.aiRecommendation"))
                    .font(.system(size: DesignTokens.FontSize.xs, weight: .semibold))
                    .foregroundColor(DesignTokens.Text.muted)
                    .textCase(.uppercase)
            }

            Text(text)
                .font(.system(size: DesignTokens.FontSize.md))
                .foregroundColor(DesignTokens.Text.primary)
                .lineSpacing(4)
        }
        .padding(DesignTokens.Spacing.md)
        .background(DesignTokens.Glass.bgMedium)
        .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.lg))
    }

    private func moviesSection(_ movies: [CollectionMovie]) -> some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
            Text(localization.t("vod.collection.movies").capitalized)
                .font(.system(size: DesignTokens.FontSize.lg, weight: .bold))
                .foregroundColor(DesignTokens.Text.primary)

            ForEach(movies.sorted(by: { ($0.collectionOrder ?? 0) < ($1.collectionOrder ?? 0) })) { movie in
                CollectionMovieRow(movie: movie) {
                    coordinator.navigate(to: .movieDetail(movieId: movie.id))
                }
            }
        }
    }

    private func downloadAll(_ movies: [CollectionMovie]) async {
        let requests = movies.map { DownloadRequest(contentId: $0.id, title: $0.title ?? "", thumbnail: $0.thumbnail, contentType: .movie, streamUrl: $0.streamUrl) }
        await downloadManager.enqueueAll(requests)
    }

    private func playAll(_ movies: [CollectionMovie]) async {
        let movieIds = movies.sorted(by: { ($0.collectionOrder ?? 0) < ($1.collectionOrder ?? 0) }).map(\.id)
        guard !movieIds.isEmpty else { return }
        do {
            try await repos.playlist.addBulkToPlaylist(contentIds: movieIds)
            coordinator.navigate(to: .player(contentId: movieIds[0], contentType: .movie))
        } catch {
            logger.error("Failed to create playlist: \(error.localizedDescription)")
        }
    }
}
