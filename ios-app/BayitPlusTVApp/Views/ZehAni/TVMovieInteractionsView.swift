#if os(tvOS)
    import BayitDesignSystem
    import BayitLocalization
    import SwiftUI

    /// Movie Interactions hub for tvOS — browse interactable movies.
    /// Each movie navigates to TVMovieCharactersView via NavigationStack push.
    struct TVMovieInteractionsView: View {
        @Environment(TVRepositoryProvider.self) var repos
        @Environment(LocalizationManager.self) var localization
        @State var movies: [InteractableMovieItem] = []
        @State var selectedMovie: InteractableMovieItem?
        @State var isLoading = true
        @State var error: String?

        private let columns = [
            GridItem(.flexible(), spacing: TVDesignTokens.Spacing.focusGap),
            GridItem(.flexible(), spacing: TVDesignTokens.Spacing.focusGap),
            GridItem(.flexible(), spacing: TVDesignTokens.Spacing.focusGap),
            GridItem(.flexible(), spacing: TVDesignTokens.Spacing.focusGap),
        ]

        var body: some View {
            ZStack {
                DesignTokens.Background.primary.ignoresSafeArea()
                if isLoading {
                    ProgressView().tint(DesignTokens.Primary.default).scaleEffect(1.5)
                } else if let errorMsg = error {
                    tvErrorState(errorMsg) { Task { await loadMovies() } }
                } else {
                    movieGrid
                }
            }
            .task { await loadMovies() }
            .navigationDestination(item: $selectedMovie) { movie in
                TVMovieCharactersView(movie: movie)
            }
        }

        private var movieGrid: some View {
            ScrollView(.vertical, showsIndicators: false) {
                LazyVStack(alignment: .leading, spacing: TVDesignTokens.Spacing.xl) {
                    TVPageHeader(
                        icon: "film.stack",
                        title: localization.t("zehAni.movieInteractions.title")
                    )
                    LazyVGrid(columns: columns, spacing: TVDesignTokens.Spacing.focusGap) {
                        ForEach(movies) { movie in
                            GlassFocusPoster(
                                thumbnailURL: movie.posterUrl,
                                title: movie.title,
                                aspectRatio: 2 / 3,
                                onSelect: { selectedMovie = movie }
                            )
                        }
                    }
                    .padding(.horizontal, TVDesignTokens.Spacing.xxl)
                    .focusSection()
                }
                .padding(.vertical, TVDesignTokens.Spacing.xl)
            }
        }

        func loadMovies() async {
            isLoading = true; error = nil
            do {
                let fetched = try await repos.movieInteraction.listInteractableMovies()
                await MainActor.run { movies = fetched; isLoading = false }
            } catch {
                await MainActor.run { self.error = error.localizedDescription; isLoading = false }
            }
        }
    }
#endif
