#if os(tvOS)
    import BayitDesignSystem
    import BayitLocalization
    import SwiftUI

    /// Movie Interactions hub for tvOS — browse interactable movies inline.
    /// Selecting a movie loads its characters below via characterPreviewSection (in +Characters).
    /// Each character NavigationLink pushes to TVCharacterDetailView.
    struct TVMovieInteractionsView: View {
        @Environment(TVRepositoryProvider.self) var repos
        @Environment(LocalizationManager.self) var localization
        @State var movies: [InteractableMovieItem] = []
        @State var selectedMovie: InteractableMovieItem?
        @State var characters: [InteractiveCharacterItem] = []
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
                    mainContent
                }
            }
            .task { await loadMovies() }
            .onChange(of: selectedMovie) { _, movie in
                characters = []
                guard let movie else { return }
                Task { await loadCharacters(contentId: movie.contentId) }
            }
        }

        private var mainContent: some View {
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
                            .overlay(alignment: .topTrailing) {
                                if selectedMovie?.contentId == movie.contentId {
                                    Image(systemName: "checkmark.circle.fill")
                                        .font(.system(size: TVDesignTokens.FontSize.xl))
                                        .foregroundStyle(DesignTokens.Success.default)
                                        .padding(TVDesignTokens.Spacing.sm)
                                }
                            }
                            .overlay(alignment: .bottomTrailing) {
                                if movie.interactionCount > 0 {
                                    Text("\(movie.interactionCount)/\(movie.maxInteractions)")
                                        .font(.system(
                                            size: TVDesignTokens.FontSize.xs,
                                            weight: .bold
                                        ))
                                        .foregroundStyle(DesignTokens.Text.primary)
                                        .padding(.horizontal, TVDesignTokens.Spacing.sm)
                                        .padding(.vertical, TVDesignTokens.Spacing.xs)
                                        .background(DesignTokens.Glass.bgStrong)
                                        .clipShape(
                                            RoundedRectangle(
                                                cornerRadius: TVDesignTokens.Radius.sm
                                            )
                                        )
                                        .padding(TVDesignTokens.Spacing.sm)
                                }
                            }
                        }
                    }
                    .padding(.horizontal, TVDesignTokens.Spacing.xxl)
                    .focusSection()

                    if !characters.isEmpty {
                        characterPreviewSection
                    }
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
