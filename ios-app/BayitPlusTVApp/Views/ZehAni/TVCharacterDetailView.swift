#if os(tvOS)
    import BayitDesignSystem
    import BayitLocalization
    import SwiftUI

    /// Character detail screen for tvOS — shows bio, actor info, and suggested questions.
    struct TVCharacterDetailView: View {
        let character: InteractiveCharacterItem
        let movie: InteractableMovieItem
        @Environment(LocalizationManager.self) var localization

        var body: some View {
            ZStack {
                DesignTokens.Background.primary.ignoresSafeArea()
                ScrollView(.vertical, showsIndicators: false) {
                    LazyVStack(alignment: .leading, spacing: TVDesignTokens.Spacing.xl) {
                        characterHeader
                        Divider().overlay(DesignTokens.Glass.border)
                        descriptionSection
                        if !character.suggestedQuestions.isEmpty {
                            questionsSection
                        }
                        Spacer()
                    }
                    .padding(TVDesignTokens.Spacing.xxl)
                }
            }
        }

        private var characterHeader: some View {
            HStack(spacing: TVDesignTokens.Spacing.xl) {
                avatarImage
                VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.sm) {
                    Text(character.name)
                        .font(.system(size: TVDesignTokens.FontSize.xxl, weight: .bold))
                        .foregroundStyle(DesignTokens.Text.primary)
                    if let actor = character.actorName {
                        Text(actor)
                            .font(.system(size: TVDesignTokens.FontSize.lg))
                            .foregroundStyle(DesignTokens.Text.secondary)
                    }
                    Text(movie.title)
                        .font(.system(size: TVDesignTokens.FontSize.base))
                        .foregroundStyle(DesignTokens.Text.muted)
                }
                Spacer()
            }
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
            .frame(width: 160, height: 160)
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

        private var descriptionSection: some View {
            GlassCard(radius: TVDesignTokens.Radius.lg, padding: TVDesignTokens.Spacing.lg) {
                Text(character.description)
                    .font(.system(size: TVDesignTokens.FontSize.lg))
                    .foregroundStyle(DesignTokens.Text.primary)
                    .lineLimit(nil)
            }
        }

        private var questionsSection: some View {
            VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.md) {
                Text(localization.t("zehAni.movieInteractions.questionsSection"))
                    .font(.system(size: TVDesignTokens.FontSize.xl, weight: .bold))
                    .foregroundStyle(DesignTokens.Text.primary)
                ForEach(
                    Array(character.suggestedQuestions.prefix(5).enumerated()),
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
                        .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md))
                    }
                    .buttonStyle(.card)
                }
            }
        }
    }
#endif
