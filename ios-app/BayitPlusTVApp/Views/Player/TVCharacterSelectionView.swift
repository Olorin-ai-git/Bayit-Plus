#if os(tvOS)
    import BayitDesignSystem
    import BayitLocalization
    import SwiftUI

    /// tvOS full-screen character selection for free-form dialogue.
    /// Focusable character cards with Siri Remote navigation.
    struct TVCharacterSelectionView: View {
        @Environment(LocalizationManager.self) private var localization
        @Environment(\.dismiss) private var dismiss

        let characters: [ContentCharacter]
        let onSelect: (ContentCharacter) -> Void
        let onDismiss: () -> Void

        var body: some View {
            VStack(spacing: TVDesignTokens.Spacing.xxl) {
                Text(localization.t("player.dialogue.selectCharacter"))
                    .font(.system(
                        size: TVDesignTokens.FontSize.hero, weight: .bold
                    ))
                    .foregroundStyle(DesignTokens.Text.primary)

                if characters.isEmpty {
                    Text(localization.t("player.dialogue.noCharactersAvailable"))
                        .font(.system(size: TVDesignTokens.FontSize.lg))
                        .foregroundStyle(DesignTokens.Text.muted)
                } else {
                    HStack(spacing: TVDesignTokens.Spacing.xxl) {
                        ForEach(characters) { character in
                            characterCard(character)
                        }
                    }
                }

                GlassButton(
                    localization.t("common.cancel"),
                    variant: .ghost,
                    size: .large
                ) {
                    onDismiss()
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(DesignTokens.Background.primary)
            .onExitCommand { onDismiss() }
        }

        private func characterCard(
            _ character: ContentCharacter
        ) -> some View {
            Button {
                onSelect(character)
            } label: {
                VStack(spacing: TVDesignTokens.Spacing.lg) {
                    CachedAsyncImage(url: URL(string: character.frameUrl)) { phase in
                        switch phase {
                        case let .success(image):
                            image.resizable().scaledToFill()
                        default:
                            Color.gray.opacity(0.3)
                        }
                    }
                    .frame(width: 160, height: 160)
                    .clipShape(Circle())
                    .overlay(
                        Circle().stroke(
                            DesignTokens.Primary.p400, lineWidth: 3
                        )
                    )
                    .shadow(
                        color: DesignTokens.Primary.default.opacity(0.4),
                        radius: 16, x: 0, y: 4
                    )

                    Text(character.name)
                        .font(.system(
                            size: TVDesignTokens.FontSize.lg, weight: .medium
                        ))
                        .foregroundStyle(DesignTokens.Text.primary)
                        .lineLimit(1)
                }
                .padding(TVDesignTokens.Spacing.lg)
            }
            .buttonStyle(.card)
        }
    }
#endif
