#if os(tvOS)
    import BayitDesignSystem
    import BayitLocalization
    import SwiftUI

    /// Movie Interactions Hub for tvOS -- browse movies and characters.
    struct TVMovieInteractionsView: View {
        @Environment(TVRepositoryProvider.self) private var repos
        @Environment(LocalizationManager.self) private var localization
        @State private var movies: [InteractableMovieItem] = []
        @State private var selectedMovie: InteractableMovieItem?
        @State private var characters: [InteractiveCharacterItem] = []
        @State private var selectedCharacter: InteractiveCharacterItem?
        @State private var isLoading = true
        @State private var error: String?

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

        private var characterShelf: some View {
            VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.md) {
                sectionTitle("zehAni.movieInteractions.charactersSection")
                ScrollView(.horizontal, showsIndicators: false) {
                    LazyHStack(spacing: TVDesignTokens.Spacing.focusGap) {
                        ForEach(characters) { c in characterCard(c) }
                    }
                    .padding(.horizontal, TVDesignTokens.Spacing.xxl)
                    .padding(.vertical, TVDesignTokens.Spacing.md)
                }
            }
        }

        private func characterCard(_ char: InteractiveCharacterItem) -> some View {
            let active = selectedCharacter?.name == char.name
            return Button { selectedCharacter = char } label: {
                VStack(spacing: TVDesignTokens.Spacing.md) {
                    asyncImage(url: char.frameUrl, fallback: "person.fill")
                        .frame(width: 140, height: 140).clipShape(Circle())
                        .overlay(Circle().stroke(DesignTokens.Glass.border, lineWidth: 1))
                    Text(char.name)
                        .font(.system(size: TVDesignTokens.FontSize.lg, weight: .semibold))
                        .foregroundStyle(DesignTokens.Text.primary)
                    if let actor = char.actorName {
                        Text(actor).font(.system(size: TVDesignTokens.FontSize.base))
                            .foregroundStyle(DesignTokens.Text.muted)
                    }
                }.frame(width: 200, height: 260).background(DesignTokens.Glass.bg)
                    .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg))
                    .overlay(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg).stroke(
                        active ? DesignTokens.Primary.default : DesignTokens.Glass.border,
                        lineWidth: active ? 2 : 1
                    ))
            }.buttonStyle(.card).tvFocusStyle()
        }

        private func characterDetail(_ char: InteractiveCharacterItem) -> some View {
            VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.lg) {
                HStack(spacing: TVDesignTokens.Spacing.xl) {
                    asyncImage(url: char.frameUrl, fallback: "person.fill")
                        .frame(width: 100, height: 100).clipShape(Circle())
                        .overlay(Circle().stroke(DesignTokens.Glass.border, lineWidth: 1))

                    VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.sm) {
                        Text(char.name)
                            .font(.system(size: TVDesignTokens.FontSize.xxl, weight: .bold))
                            .foregroundStyle(DesignTokens.Text.primary)
                        if let actor = char.actorName {
                            Text(actor)
                                .font(.system(size: TVDesignTokens.FontSize.lg))
                                .foregroundStyle(DesignTokens.Text.secondary)
                        }
                    }
                    Spacer()
                }

                Text(char.description)
                    .font(.system(size: TVDesignTokens.FontSize.lg))
                    .foregroundStyle(DesignTokens.Text.primary)
                    .lineLimit(4)

                if !char.suggestedQuestions.isEmpty {
                    Text(localization.t("zehAni.movieInteractions.questionsSection"))
                        .font(.system(size: TVDesignTokens.FontSize.lg, weight: .semibold))
                        .foregroundStyle(DesignTokens.Text.secondary)

                    ForEach(
                        Array(char.suggestedQuestions.prefix(3).enumerated()),
                        id: \.offset
                    ) { _, question in
                        Button {} label: {
                            HStack(spacing: TVDesignTokens.Spacing.md) {
                                Image(systemName: "quote.opening")
                                    .font(.system(size: TVDesignTokens.FontSize.sm))
                                    .foregroundStyle(DesignTokens.Primary.default)
                                Text(question)
                                    .font(.system(size: TVDesignTokens.FontSize.base))
                                    .foregroundStyle(DesignTokens.Text.primary)
                                    .multilineTextAlignment(.leading)
                                Spacer()
                            }
                            .padding(TVDesignTokens.Spacing.md)
                            .background(DesignTokens.Glass.bgLight)
                            .clipShape(
                                RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md)
                            )
                        }
                        .buttonStyle(.card)
                    }
                }
            }
            .padding(TVDesignTokens.Spacing.xl)
            .padding(.horizontal, TVDesignTokens.Spacing.xxl)
            .background(DesignTokens.Glass.bgMedium)
            .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg))
            .overlay(
                RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg)
                    .stroke(DesignTokens.Glass.border, lineWidth: 1)
            )
        }

        // MARK: - Helpers

        private func sectionTitle(_ key: String) -> some View {
            Text(localization.t(key))
                .font(.system(size: TVDesignTokens.FontSize.xl, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)
                .padding(.horizontal, TVDesignTokens.Spacing.xxl)
        }

        private func asyncImage(url: String?, fallback: String) -> some View {
            Group {
                if let u = url, !u.isEmpty, let parsed = URL(string: u) {
                    AsyncImage(url: parsed) { phase in
                        switch phase {
                        case let .success(image):
                            image.resizable().aspectRatio(contentMode: .fill)
                        case .empty:
                            ProgressView()
                                .tint(DesignTokens.Text.muted)
                                .frame(maxWidth: .infinity, maxHeight: .infinity)
                                .background(DesignTokens.Glass.bgStrong)
                        case .failure:
                            placeholder(fallback)
                        @unknown default:
                            placeholder(fallback)
                        }
                    }
                } else { placeholder(fallback) }
            }
        }

        private func placeholder(_ icon: String) -> some View {
            ZStack {
                DesignTokens.Glass.bgStrong
                Image(systemName: icon)
                    .font(.system(size: TVDesignTokens.FontSize.xxxl))
                    .foregroundStyle(DesignTokens.Text.muted)
            }
        }

        // MARK: - Data Loading

        private func loadMovies() async {
            isLoading = true; error = nil
            do {
                let fetched = try await repos.movieInteraction.listInteractableMovies()
                await MainActor.run { movies = fetched; isLoading = false }
            } catch {
                await MainActor.run {
                    self.error = error.localizedDescription; isLoading = false
                }
            }
        }

        private func loadCharacters(contentId: String) async {
            do {
                let status = try await repos.movieInteraction.getMovieCharacters(
                    contentId: contentId
                )
                await MainActor.run { characters = status.characters }
            } catch {
                await MainActor.run { self.error = error.localizedDescription }
            }
        }
    }
#endif
