#if os(tvOS)
import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Movie Interactions Hub for tvOS -- browse movies, characters, questions.
struct TVMovieInteractionsView: View {
    @Environment(TVRepositoryProvider.self) private var repos
    @Environment(LocalizationManager.self) private var localization
    @State private var movies: [InteractableMovieItem] = []
    @State private var selectedMovie: InteractableMovieItem?
    @State private var characters: [InteractiveCharacterItem] = []
    @State private var selectedCharacter: InteractiveCharacterItem?
    @State private var questions: CharacterQuestionsItem?
    @State private var isLoading = true
    @State private var error: String?
    @FocusState private var focusedSection: Section?
    private enum Section: Hashable { case movies, characters, questions }

    var body: some View {
        ZStack {
            DesignTokens.Background.primary.ignoresSafeArea()
            if isLoading {
                ProgressView().tint(DesignTokens.Primary.default).scaleEffect(1.5)
            } else if let errorMsg = error {
                tvErrorState(errorMsg) { Task { await loadMovies() } }
            } else { mainContent }
        }
        .task { await loadMovies() }
        .onChange(of: selectedMovie) { _, movie in
            characters = []; selectedCharacter = nil; questions = nil
            guard let movie else { return }
            Task { await loadCharacters(contentId: movie.contentId) }
        }
        .onChange(of: selectedCharacter) { _, char in
            questions = nil
            guard let movie = selectedMovie, let char else { return }
            Task { await loadQuestions(contentId: movie.contentId, name: char.name) }
        }
    }

    private var mainContent: some View {
        ScrollView(.vertical, showsIndicators: false) {
            VStack(spacing: TVDesignTokens.Spacing.xl) {
                headerSection
                movieShelf
                if !characters.isEmpty { characterShelf }
                if let q = questions, !(q.specificQuestions.isEmpty && q.genericQuestions.isEmpty) { questionsList(q) }
            }
            .padding(.horizontal, TVDesignTokens.Spacing.xxl)
            .padding(.vertical, TVDesignTokens.Spacing.xl)
        }
    }

    private var headerSection: some View {
        VStack(spacing: TVDesignTokens.Spacing.md) {
            Image(systemName: "film.stack")
                .font(.system(size: TVDesignTokens.FontSize.hero))
                .foregroundStyle(DesignTokens.Primary.default)
            Text(localization.t("zehAni.movieInteractions.title"))
                .font(.system(size: TVDesignTokens.FontSize.display, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)
            Text(localization.t("zehAni.movieInteractions.subtitle"))
                .font(.system(size: TVDesignTokens.FontSize.lg))
                .foregroundStyle(DesignTokens.Text.secondary)
                .multilineTextAlignment(.center)
        }.frame(maxWidth: .infinity).padding(.bottom, TVDesignTokens.Spacing.md)
    }

    private var movieShelf: some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.md) {
            sectionTitle("zehAni.movieInteractions.moviesSection")
            ScrollView(.horizontal, showsIndicators: false) {
                LazyHStack(spacing: TVDesignTokens.Spacing.focusGap) {
                    ForEach(movies) { movie in movieCard(movie) }
                }.padding(.vertical, TVDesignTokens.Spacing.md)
            }.focusSection()
        }
    }

    private func movieCard(_ movie: InteractableMovieItem) -> some View {
        Button { selectedMovie = movie; focusedSection = .characters } label: {
            GlassCard(radius: TVDesignTokens.Radius.lg, padding: 0) {
                VStack(spacing: 0) {
                    asyncImage(url: movie.posterUrl, fallback: "film")
                        .frame(width: TVDesignTokens.MinSize.posterWidth,
                               height: TVDesignTokens.MinSize.posterHeight).clipped()
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
                }.padding(.vertical, TVDesignTokens.Spacing.md)
            }.focusSection()
        }
    }

    private func characterCard(_ char: InteractiveCharacterItem) -> some View {
        let active = selectedCharacter?.name == char.name
        return Button { selectedCharacter = char; focusedSection = .questions } label: {
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
                lineWidth: active ? 2 : 1))
        }.buttonStyle(.card).tvFocusStyle()
    }

    private func questionsList(_ item: CharacterQuestionsItem) -> some View {
        let allQuestions = item.specificQuestions + item.genericQuestions
        return VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.md) {
            sectionTitle("zehAni.movieInteractions.questionsSection")
            ForEach(Array(allQuestions.enumerated()), id: \.offset) { _, q in
                GlassChip(title: q, isSelected: false, onTap: {})
            }
        }.focusSection()
    }

    // MARK: - Helpers

    private func sectionTitle(_ key: String) -> some View {
        Text(localization.t(key))
            .font(.system(size: TVDesignTokens.FontSize.xl, weight: .bold))
            .foregroundStyle(DesignTokens.Text.primary)
    }

    private func asyncImage(url: String?, fallback: String) -> some View {
        Group {
            if let u = url, let parsed = URL(string: u) {
                AsyncImage(url: parsed) { p in
                    if case .success(let img) = p { img.resizable().aspectRatio(contentMode: .fill) }
                    else { placeholder(fallback) }
                }
            } else { placeholder(fallback) }
        }
    }

    private func placeholder(_ icon: String) -> some View {
        ZStack {
            DesignTokens.Glass.bgStrong
            Image(systemName: icon).font(.system(size: TVDesignTokens.FontSize.xxxl))
                .foregroundStyle(DesignTokens.Text.muted)
        }
    }

    // MARK: - Data Loading

    private func loadMovies() async {
        isLoading = true; error = nil
        do {
            let fetched = try await repos.movieInteraction.listInteractableMovies()
            await MainActor.run { movies = fetched; isLoading = false }
        } catch { await MainActor.run { self.error = error.localizedDescription; isLoading = false } }
    }

    private func loadCharacters(contentId: String) async {
        do {
            let status = try await repos.movieInteraction.getMovieCharacters(contentId: contentId)
            await MainActor.run { characters = status.characters }
        } catch { await MainActor.run { self.error = error.localizedDescription } }
    }

    private func loadQuestions(contentId: String, name: String) async {
        do {
            let fetched = try await repos.movieInteraction.getCharacterQuestions(
                contentId: contentId, characterName: name)
            await MainActor.run { questions = fetched }
        } catch { await MainActor.run { self.error = error.localizedDescription } }
    }
}
#endif
