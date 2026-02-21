#if os(tvOS)
    import BayitDesignSystem
    import BayitLocalization
    import SwiftUI

    // MARK: - TVMovieInteractionsView + Character Sections

    extension TVMovieInteractionsView {
        var characterShelf: some View {
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

        func characterCard(_ char: InteractiveCharacterItem) -> some View {
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

        func characterDetail(_ char: InteractiveCharacterItem) -> some View {
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

        func sectionTitle(_ key: String) -> some View {
            Text(localization.t(key))
                .font(.system(size: TVDesignTokens.FontSize.xl, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)
                .padding(.horizontal, TVDesignTokens.Spacing.xxl)
        }

        func asyncImage(url: String?, fallback: String) -> some View {
            Group {
                if let u = url, !u.isEmpty, let parsed = URL(string: u) {
                    CachedAsyncImage(url: parsed) {
                        placeholder(fallback)
                    }
                } else { placeholder(fallback) }
            }
        }

        func placeholder(_ icon: String) -> some View {
            ZStack {
                DesignTokens.Glass.bgStrong
                Image(systemName: icon)
                    .font(.system(size: TVDesignTokens.FontSize.xxxl))
                    .foregroundStyle(DesignTokens.Text.muted)
            }
        }

        // MARK: - Data Loading

        func loadMovies() async {
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

        func loadCharacters(contentId: String) async {
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
