#if os(tvOS)
    import BayitDesignSystem
    import BayitLocalization
    import SwiftUI

    /// Character selection screen for tvOS — lists characters for a given movie.
    /// Each character navigates to TVCharacterDetailView via NavigationLink push.
    struct TVMovieCharactersView: View {
        let movie: InteractableMovieItem
        @Environment(TVRepositoryProvider.self) var repos
        @Environment(LocalizationManager.self) var localization
        @State var characters: [InteractiveCharacterItem] = []
        @State var isLoading = true
        @State var error: String?

        var body: some View {
            ZStack {
                DesignTokens.Background.primary.ignoresSafeArea()
                if isLoading {
                    ProgressView().tint(DesignTokens.Primary.default).scaleEffect(1.5)
                } else if let errorMsg = error {
                    tvErrorState(errorMsg) { Task { await loadCharacters() } }
                } else {
                    characterList
                }
            }
            .task { await loadCharacters() }
        }

        private var characterList: some View {
            ScrollView(.vertical, showsIndicators: false) {
                LazyVStack(alignment: .leading, spacing: TVDesignTokens.Spacing.xl) {
                    TVPageHeader(icon: "person.fill", title: movie.title)
                    Text(localization.t("zehAni.movieInteractions.selectCharacter"))
                        .font(.system(size: TVDesignTokens.FontSize.lg))
                        .foregroundStyle(DesignTokens.Text.secondary)
                        .padding(.horizontal, TVDesignTokens.Spacing.xxl)
                    ScrollView(.horizontal, showsIndicators: false) {
                        LazyHStack(spacing: TVDesignTokens.Spacing.focusGap) {
                            ForEach(characters) { character in
                                NavigationLink {
                                    TVCharacterDetailView(character: character, movie: movie)
                                } label: {
                                    TVCharacterCard(character: character)
                                }
                                .buttonStyle(.card)
                                .tvFocusStyle()
                            }
                        }
                        .padding(.horizontal, TVDesignTokens.Spacing.xxl)
                        .padding(.vertical, TVDesignTokens.Spacing.md)
                    }
                    .focusSection()
                }
                .padding(.vertical, TVDesignTokens.Spacing.xl)
            }
        }

        func loadCharacters() async {
            isLoading = true; error = nil
            do {
                let status = try await repos.movieInteraction.getMovieCharacters(
                    contentId: movie.contentId
                )
                await MainActor.run { characters = status.characters; isLoading = false }
            } catch {
                await MainActor.run { self.error = error.localizedDescription; isLoading = false }
            }
        }
    }

    /// Pure display card — interactivity is handled by the enclosing NavigationLink.
    private struct TVCharacterCard: View {
        let character: InteractiveCharacterItem

        var body: some View {
            VStack(spacing: TVDesignTokens.Spacing.md) {
                avatarImage
                Text(character.name)
                    .font(.system(size: TVDesignTokens.FontSize.lg, weight: .semibold))
                    .foregroundStyle(DesignTokens.Text.primary)
                    .lineLimit(2)
                    .multilineTextAlignment(.center)
                if let actor = character.actorName {
                    Text(actor)
                        .font(.system(size: TVDesignTokens.FontSize.base))
                        .foregroundStyle(DesignTokens.Text.muted)
                        .lineLimit(1)
                }
            }
            .frame(width: 200, height: 260)
            .background(DesignTokens.Glass.bg)
            .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg))
            .overlay(
                RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg)
                    .stroke(DesignTokens.Glass.border, lineWidth: 1)
            )
        }

        private var avatarImage: some View {
            Group {
                if let url = URL(string: character.frameUrl) {
                    CachedAsyncImage(url: url) {
                        avatarPlaceholder
                    }
                } else {
                    avatarPlaceholder
                }
            }
            .frame(width: 140, height: 140)
            .clipShape(Circle())
            .overlay(Circle().stroke(DesignTokens.Glass.border, lineWidth: 1))
        }

        private var avatarPlaceholder: some View {
            ZStack {
                DesignTokens.Glass.bgStrong
                Image(systemName: "person.fill")
                    .font(.system(size: TVDesignTokens.FontSize.xxxl))
                    .foregroundStyle(DesignTokens.Text.muted)
            }
        }
    }
#endif
