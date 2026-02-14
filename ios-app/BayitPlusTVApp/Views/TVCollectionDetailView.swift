import BayitDesignSystem
import SwiftUI

/// tvOS collection detail screen with remote focus navigation
struct TVCollectionDetailView: View {
    @Environment(TVRepositoryProvider.self) private var repos
    @Environment(TVNavigationCoordinator.self) private var coordinator
    @State private var viewModel: CollectionDetailViewModel?

    let collectionId: String

    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            if let vm = viewModel {
                if vm.isLoading && vm.collection == nil {
                    ScreenLoadingView()
                } else if let error = vm.error, vm.collection == nil {
                    tvErrorState(error) {
                        Task { await vm.loadCollection() }
                    }
                } else if let collection = vm.collection {
                    collectionContent(collection)
                }
            } else {
                ScreenLoadingView()
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

    private func collectionContent(_ collection: CollectionDetail) -> some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.xl) {
            if let backdrop = collection.backdrop {
                backdropHero(backdrop, title: collection.title ?? "Collection")
            }

            VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.lg) {
                collectionHeader(collection)

                if let promoText = collection.promoText {
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
                .foregroundColor(DesignTokens.Text.primary)

            if let available = collection.availableMovies,
               let total = collection.totalMovies {
                Text(total > available ? "\(available) of \(total) movies" : "\(available) movies")
                    .font(.system(size: TVDesignTokens.FontSize.xl))
                    .foregroundColor(DesignTokens.Text.muted)
            }

            if !collection.movies.isEmpty {
                GlassFocusButton(
                    title: "Play All",
                    icon: "play.fill",
                    style: .primary,
                    size: .large
                ) {
                    Task { await playAll(collection.movies) }
                }
            }
        }
    }

    private func promoCard(_ text: String) -> some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.sm) {
            HStack(spacing: TVDesignTokens.Spacing.xs) {
                Image(systemName: "sparkles")
                    .foregroundColor(DesignTokens.Primary.default)
                Text("AI Recommendation")
                    .font(.system(size: TVDesignTokens.FontSize.md, weight: .semibold))
                    .foregroundColor(DesignTokens.Text.muted)
                    .textCase(.uppercase)
            }

            Text(text)
                .font(.system(size: TVDesignTokens.FontSize.lg))
                .foregroundColor(DesignTokens.Text.primary)
                .lineSpacing(6)
        }
        .padding(TVDesignTokens.Spacing.lg)
        .background(DesignTokens.Glass.bgMedium)
        .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg))
    }

    private func moviesGrid(_ movies: [CollectionMovie]) -> some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.md) {
            Text("Movies")
                .font(.system(size: TVDesignTokens.FontSize.xxl, weight: .bold))
                .foregroundColor(DesignTokens.Text.primary)

            let columns = [
                GridItem(.flexible(), spacing: TVDesignTokens.Spacing.focusGap),
                GridItem(.flexible(), spacing: TVDesignTokens.Spacing.focusGap),
                GridItem(.flexible(), spacing: TVDesignTokens.Spacing.focusGap)
            ]

            LazyVGrid(columns: columns, spacing: TVDesignTokens.Spacing.focusGap) {
                ForEach(movies.sorted(by: { $0.order < $1.order })) { movie in
                    GlassFocusPoster(
                        thumbnailURL: movie.thumbnail,
                        title: movie.title ?? "Untitled",
                        subtitle: movieSubtitle(movie),
                        badge: "\(movie.order)",
                        aspectRatio: 16 / 9,
                        onSelect: {
                            coordinator.fullscreenRoute = .movieDetail(movieId: movie.id)
                        }
                    )
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
        let movieIds = movies.sorted(by: { $0.order < $1.order }).map { $0.id }
        guard !movieIds.isEmpty else { return }

        do {
            try await repos.playlist.addBulkToPlaylist(contentIds: movieIds)
            coordinator.fullscreenRoute = .movieDetail(movieId: movieIds[0])
        } catch {
            viewModel?.error = "Failed to create playlist"
        }
    }
}

private func tvErrorState(_ message: String, retry: @escaping () -> Void) -> some View {
    VStack(spacing: TVDesignTokens.Spacing.lg) {
        Text(message)
            .font(.system(size: TVDesignTokens.FontSize.xl))
            .foregroundColor(DesignTokens.Text.secondary)

        GlassFocusButton(title: "Retry", icon: "arrow.clockwise", style: .secondary, size: .medium, action: retry)
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity)
    .padding(TVDesignTokens.Spacing.xl)
}
