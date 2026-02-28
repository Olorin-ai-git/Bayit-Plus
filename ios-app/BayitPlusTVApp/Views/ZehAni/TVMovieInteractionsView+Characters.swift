#if os(tvOS)
    import BayitDesignSystem
    import BayitLocalization
    import SwiftUI

    // MARK: - TVMovieInteractionsView + Character Sections

    extension TVMovieInteractionsView {
        // MARK: - Character Preview Shelf

        var characterPreviewSection: some View {
            VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.md) {
                characterSectionHeader
                ScrollView(.horizontal, showsIndicators: false) {
                    LazyHStack(spacing: TVDesignTokens.Spacing.focusGap) {
                        ForEach(characters) { character in
                            characterLink(for: character)
                        }
                    }
                    .padding(.horizontal, TVDesignTokens.Spacing.xxl)
                    .padding(.vertical, TVDesignTokens.Spacing.md)
                }
                .focusSection()
            }
        }

        private var characterSectionHeader: some View {
            HStack(spacing: TVDesignTokens.Spacing.sm) {
                Image(systemName: "person.3.fill")
                    .font(.system(size: TVDesignTokens.FontSize.xl))
                    .foregroundStyle(DesignTokens.Primary.default)
                Text(localization.t("zehAni.movieInteractions.selectCharacter"))
                    .font(.system(size: TVDesignTokens.FontSize.xl, weight: .bold))
                    .foregroundStyle(DesignTokens.Text.primary)
                if let movie = selectedMovie {
                    Text("· \(movie.title)")
                        .font(.system(size: TVDesignTokens.FontSize.lg))
                        .foregroundStyle(DesignTokens.Text.secondary)
                }
            }
            .padding(.horizontal, TVDesignTokens.Spacing.xxl)
        }

        // MARK: - Character NavigationLink

        @ViewBuilder
        func characterLink(for character: InteractiveCharacterItem) -> some View {
            if let movie = selectedMovie {
                NavigationLink {
                    TVCharacterDetailView(character: character, movie: movie)
                        .tvBreadcrumb(character.name, icon: "person.fill")
                } label: {
                    characterCardLabel(character)
                }
                .buttonStyle(.card)
                .tvFocusStyle()
            }
        }

        // MARK: - Character Card Label (pure display — NavigationLink handles selection)

        func characterCardLabel(_ character: InteractiveCharacterItem) -> some View {
            VStack(spacing: TVDesignTokens.Spacing.md) {
                characterAvatar(url: character.frameUrl)
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

        // MARK: - Avatar

        func characterAvatar(url: String) -> some View {
            Group {
                if let imgUrl = URL(string: url) {
                    CachedAsyncImage(url: imgUrl) { phase in
                        switch phase {
                        case let .success(image):
                            image.resizable().scaledToFill()
                        default:
                            avatarPlaceholder
                        }
                    }
                } else {
                    avatarPlaceholder
                }
            }
            .frame(width: 140, height: 140)
            .clipShape(Circle())
            .overlay(Circle().stroke(DesignTokens.Glass.border, lineWidth: 1))
        }

        var avatarPlaceholder: some View {
            ZStack {
                DesignTokens.Glass.bgStrong
                Image(systemName: "person.fill")
                    .font(.system(size: TVDesignTokens.FontSize.xxxl))
                    .foregroundStyle(DesignTokens.Text.muted)
            }
        }

        // MARK: - Data Loading

        func loadCharacters(contentId: String) async {
            do {
                let status = try await repos.movieInteraction.getMovieCharacters(
                    contentId: contentId
                )
                await MainActor.run { characters = status.characters }
            } catch {
                // Character loading is non-fatal; movie grid remains functional
            }
        }
    }
#endif
