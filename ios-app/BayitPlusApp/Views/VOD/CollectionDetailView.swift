import BayitCore
import BayitDesignSystem
import SwiftUI

/// Collection detail screen showing all movies in a collection with Play All functionality
struct CollectionDetailView: View {
    @Environment(RepositoryProvider.self) private var repos
    @Environment(NavigationCoordinator.self) private var coordinator
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
        .navigationTitle("Collection")
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

    private func collectionContent(
        _ collection: CollectionDetail,
        _ vm: CollectionDetailViewModel
    ) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            if let backdrop = collection.backdrop {
                backdropHero(backdrop, title: collection.title ?? "Collection")
            }

            VStack(alignment: .leading, spacing: DesignTokens.Spacing.lg) {
                collectionHeader(collection)

                if let promoText = collection.promoText {
                    promoCard(promoText)
                }

                if !collection.movies.isEmpty {
                    moviesSection(collection.movies)
                }
            }
            .padding(.horizontal, DesignTokens.Spacing.lg)
            .padding(.vertical, DesignTokens.Spacing.md)
        }
    }

    private func backdropHero(_ backdropUrl: String, title: String) -> some View {
        AsyncImage(url: URL(string: backdropUrl)) { phase in
            switch phase {
            case .success(let image):
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
            Text(collection.title ?? "Collection")
                .font(.system(size: DesignTokens.FontSize.xxl, weight: .bold))
                .foregroundColor(DesignTokens.Text.primary)

            HStack(spacing: DesignTokens.Spacing.sm) {
                if let available = collection.availableMovies,
                   let total = collection.totalMovies {
                    Text(total > available ? "\(available) of \(total) movies" : "\(available) movies")
                        .font(.system(size: DesignTokens.FontSize.md))
                        .foregroundColor(DesignTokens.Text.muted)
                }
            }

            if !collection.movies.isEmpty {
                Button {
                    Task { await playAll(collection.movies) }
                } label: {
                    HStack {
                        Image(systemName: "play.fill")
                        Text("Play All")
                            .font(.system(size: DesignTokens.FontSize.md, weight: .semibold))
                    }
                    .foregroundColor(.white)
                    .padding(.horizontal, DesignTokens.Spacing.lg)
                    .padding(.vertical, DesignTokens.Spacing.md)
                    .background(DesignTokens.Primary.default)
                    .clipShape(Capsule())
                }
                .buttonStyle(.plain)
                .padding(.top, DesignTokens.Spacing.sm)
            }
        }
    }

    private func promoCard(_ text: String) -> some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            HStack(spacing: DesignTokens.Spacing.xs) {
                Image(systemName: "sparkles")
                    .foregroundColor(DesignTokens.Primary.default)
                Text("AI Recommendation")
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
            Text("Movies")
                .font(.system(size: DesignTokens.FontSize.lg, weight: .bold))
                .foregroundColor(DesignTokens.Text.primary)

            ForEach(movies.sorted(by: { $0.order < $1.order })) { movie in
                MovieRow(movie: movie) {
                    coordinator.navigate(to: .movieDetail(movieId: movie.id))
                }
            }
        }
    }

    private func playAll(_ movies: [CollectionMovie]) async {
        let movieIds = movies.sorted(by: { $0.order < $1.order }).map { $0.id }
        guard !movieIds.isEmpty else { return }

        do {
            try await repos.playlist.addBulkToPlaylist(contentIds: movieIds)
            coordinator.navigate(to: .movieDetail(movieId: movieIds[0]))
        } catch {
            logger.error("Failed to create playlist: \(error.localizedDescription)")
        }
    }
}

private struct MovieRow: View {
    let movie: CollectionMovie
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            HStack(spacing: DesignTokens.Spacing.md) {
                Text("\(movie.order).")
                    .font(.system(size: DesignTokens.FontSize.lg, weight: .bold))
                    .foregroundColor(DesignTokens.Text.muted)
                    .frame(width: 30, alignment: .trailing)

                if let thumbnail = movie.thumbnail, let url = URL(string: thumbnail) {
                    AsyncImage(url: url) { phase in
                        switch phase {
                        case .success(let image):
                            image.resizable().aspectRatio(contentMode: .fill)
                        default:
                            Rectangle().fill(DesignTokens.Glass.bgMedium)
                        }
                    }
                    .frame(width: 100, height: 60)
                    .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.sm))
                }

                VStack(alignment: .leading, spacing: 2) {
                    Text(movie.title ?? "Untitled")
                        .font(.system(size: DesignTokens.FontSize.md, weight: .semibold))
                        .foregroundColor(DesignTokens.Text.primary)
                        .lineLimit(2)

                    if let year = movie.year, let duration = movie.duration {
                        Text("\(year) • \(duration)")
                            .font(.system(size: DesignTokens.FontSize.sm))
                            .foregroundColor(DesignTokens.Text.muted)
                    }
                }

                Spacer()

                Image(systemName: "chevron.right")
                    .foregroundColor(DesignTokens.Text.muted)
            }
            .padding(DesignTokens.Spacing.sm)
            .background(DesignTokens.Glass.bg)
            .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
        }
        .buttonStyle(.plain)
    }
}
