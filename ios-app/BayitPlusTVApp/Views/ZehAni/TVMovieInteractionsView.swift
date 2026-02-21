#if os(tvOS)
    import BayitDesignSystem
    import BayitLocalization
    import SwiftUI

    /// Movie Interactions Hub for tvOS -- browse movies and characters.
    struct TVMovieInteractionsView: View {
        @Environment(TVRepositoryProvider.self) var repos
        @Environment(LocalizationManager.self) var localization
        @State var movies: [InteractableMovieItem] = []
        @State var selectedMovie: InteractableMovieItem?
        @State var characters: [InteractiveCharacterItem] = []
        @State var selectedCharacter: InteractiveCharacterItem?
        @State var isLoading = true
        @State var error: String?

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
                characters = []; selectedCharacter = nil
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
                    if let movie = selectedMovie {
                        Text(movie.title)
                            .font(.system(size: TVDesignTokens.FontSize.lg))
                            .foregroundStyle(DesignTokens.Text.secondary)
                            .padding(.horizontal, TVDesignTokens.Spacing.xxl)
                    }
                    movieShelf
                    if !characters.isEmpty { characterShelf }
                    if let char = selectedCharacter { characterDetail(char) }
                }
                .padding(.vertical, TVDesignTokens.Spacing.xl)
            }
        }

        private var movieShelf: some View {
            VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.md) {
                sectionTitle("zehAni.movieInteractions.moviesSection")
                ScrollView(.horizontal, showsIndicators: false) {
                    LazyHStack(spacing: TVDesignTokens.Spacing.focusGap) {
                        ForEach(movies) { movie in movieCard(movie) }
                    }
                    .padding(.horizontal, TVDesignTokens.Spacing.xxl)
                    .padding(.vertical, TVDesignTokens.Spacing.md)
                }.focusSection()
            }
        }

        private func movieCard(_ movie: InteractableMovieItem) -> some View {
            Button { selectedMovie = movie } label: {
                GlassCard(radius: TVDesignTokens.Radius.lg, padding: 0) {
                    VStack(spacing: 0) {
                        asyncImage(url: movie.posterUrl, fallback: "film")
                            .frame(
                                width: TVDesignTokens.MinSize.posterWidth,
                                height: TVDesignTokens.MinSize.posterHeight
                            ).clipped()
                        Text(movie.title)
                            .font(.system(size: TVDesignTokens.FontSize.md, weight: .semibold))
                            .foregroundStyle(DesignTokens.Text.primary)
                            .lineLimit(2).multilineTextAlignment(.center)
                            .padding(TVDesignTokens.Spacing.md)
                    }
                }.frame(width: TVDesignTokens.MinSize.posterWidth)
                    .overlay(alignment: .topTrailing) {
                        if selectedMovie?.contentId == movie.contentId {
                            Image(systemName: "checkmark.circle.fill")
                                .font(.system(size: TVDesignTokens.FontSize.xl))
                                .foregroundStyle(DesignTokens.Success.default)
                                .padding(TVDesignTokens.Spacing.sm)
                        }
                    }
            }.buttonStyle(.card).tvFocusStyle()
        }
    }
#endif
