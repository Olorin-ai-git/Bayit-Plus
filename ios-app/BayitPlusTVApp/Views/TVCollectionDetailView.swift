#if os(tvOS)
import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// tvOS collection detail screen with remote focus navigation
struct TVCollectionDetailView: View {
    @Environment(TVRepositoryProvider.self) private var repos
    @Environment(TVNavigationCoordinator.self) private var coordinator
    @Environment(LocalizationManager.self) private var localization
    @State private var viewModel: CollectionDetailViewModel?

    let collectionId: String

    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            if let vm = viewModel {
                if vm.isLoading && vm.collection == nil {
                    loadingView
                } else if let error = vm.error, vm.collection == nil {
                    tvErrorState(error) {
                        Task { await vm.loadCollection() }
                    }
                } else if let collection = vm.collection {
                    collectionContent(collection)
                }
            } else {
                loadingView
            }
        }
        .background(DesignTokens.Background.primary)
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

    private var loadingView: some View {
        VStack(spacing: TVDesignTokens.Spacing.xl) {
            ProgressView()
                .tint(DesignTokens.Primary.default)
                .scaleEffect(1.5)
        }
        .frame(maxWidth: .infinity, minHeight: 400)
    }

    private func collectionContent(_ collection: CollectionDetail) -> some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.xl) {
            if let backdrop = collection.backdrop {
                backdropHero(backdrop, title: collection.title ?? "Collection")
            }

            VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.lg) {
                collectionHeader(collection)

                if let promoText = collection.localizedPromoText(for: localization.currentLanguage.rawValue) {
                    promoCard(promoText)
                }

                if !collection.movies.isEmpty {
                    moviesGrid(collection.movies)
                }
            }
            .padding(.horizontal, TVDesignTokens.Spacing.xl)
        }
    }

    private func backdropHero(_ backdropUrl: String, title: String) -> some View {
        AsyncImage(url: URL(string: backdropUrl)) { phase in
            switch phase {
            case .success(let image):
                image.resizable().aspectRatio(contentMode: .fill)
            default:
                Rectangle().fill(DesignTokens.Glass.bgMedium)
            }
        }
        .frame(height: 500)
        .clipped()
    }

    private func collectionHeader(_ collection: CollectionDetail) -> some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.md) {
            Text(collection.title ?? "Collection")
                .font(.system(size: TVDesignTokens.FontSize.xxxl, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)

            if let available = collection.availableMovies,
               let total = collection.totalMovies {
                Text(total > available ? "\(available) \(localization.t("vod.collection.of")) \(total) \(localization.t("vod.collection.movies"))" : "\(available) \(localization.t("vod.collection.movies"))")
                    .font(.system(size: TVDesignTokens.FontSize.xl))
                    .foregroundStyle(DesignTokens.Text.muted)
            }

            if !collection.movies.isEmpty {
                Button {
                    Task { await playAll(collection.movies) }
                } label: {
                    Label(localization.t("vod.collection.playAll"), systemImage: "play.fill")
                        .font(.system(size: TVDesignTokens.FontSize.lg, weight: .semibold))
                }
                .buttonStyle(.card)
            }
        }
    }

    private func promoCard(_ text: String) -> some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.sm) {
            HStack(spacing: TVDesignTokens.Spacing.xs) {
                Image(systemName: "sparkles")
                    .foregroundStyle(DesignTokens.Primary.default)
                Text(localization.t("vod.collection.aiRecommendation"))
                    .font(.system(size: TVDesignTokens.FontSize.md, weight: .semibold))
                    .foregroundStyle(DesignTokens.Text.muted)
                    .textCase(.uppercase)
            }

            Text(text)
                .font(.system(size: TVDesignTokens.FontSize.lg))
                .foregroundStyle(DesignTokens.Text.primary)
                .lineSpacing(6)
        }
        .padding(TVDesignTokens.Spacing.lg)
        .background(DesignTokens.Glass.bgMedium)
        .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg))
    }

    private func moviesGrid(_ movies: [CollectionMovie]) -> some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.md) {
            Text(localization.t("vod.collection.movies").capitalized)
                .font(.system(size: TVDesignTokens.FontSize.xxl, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)

            let columns = [
                GridItem(.flexible(), spacing: TVDesignTokens.Spacing.focusGap),
                GridItem(.flexible(), spacing: TVDesignTokens.Spacing.focusGap),
                GridItem(.flexible(), spacing: TVDesignTokens.Spacing.focusGap)
            ]

            LazyVGrid(columns: columns, spacing: TVDesignTokens.Spacing.focusGap) {
                ForEach(movies.sorted(by: { ($0.collectionOrder ?? 0) < ($1.collectionOrder ?? 0) })) { movie in
                    TVContentCard(
                        imageURL: movie.thumbnail,
                        title: movie.title ?? "Untitled",
                        subtitle: movieSubtitle(movie),
                        badge: "\(movie.collectionOrder ?? 0)",
                        aspectRatio: 16 / 9,
                        placeholderIcon: "film"
                    ) {
                        coordinator.fullscreenRoute = .movieDetail(movieId: movie.id)
                    }
                }
            }
        }
    }

    private func movieSubtitle(_ movie: CollectionMovie) -> String? {
        var parts: [String] = []
        if let year = movie.year { parts.append(String(year)) }
        if let duration = movie.duration { parts.append(duration) }
        return parts.isEmpty ? nil : parts.joined(separator: " | ")
    }

    private func playAll(_ movies: [CollectionMovie]) async {
        let movieIds = movies.sorted(by: { ($0.collectionOrder ?? 0) < ($1.collectionOrder ?? 0) }).map { $0.id }
        guard !movieIds.isEmpty else { return }

        do {
            try await repos.playlist.addBulkToPlaylist(contentIds: movieIds)
            coordinator.fullscreenRoute = .player(contentId: movieIds[0], contentType: .vod, channelId: nil)
        } catch {
            coordinator.fullscreenRoute = .player(contentId: movieIds[0], contentType: .vod, channelId: nil)
        }
    }
}
#endif
