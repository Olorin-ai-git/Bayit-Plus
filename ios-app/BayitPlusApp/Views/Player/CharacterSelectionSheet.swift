#if os(iOS)
    import BayitDesignSystem
    import BayitLocalization
    import SwiftUI

    /// Bottom sheet presenting available characters for free-form dialogue.
    /// Displays character images in circular thumbnails with names.
    struct CharacterSelectionSheet: View {
        @Environment(LocalizationManager.self) private var localization

        let characters: [ContentCharacter]
        let onSelect: (ContentCharacter) -> Void
        let onDismiss: () -> Void

        var body: some View {
            VStack(spacing: DesignTokens.Spacing.lg) {
                Text(localization.t("player.dialogue.selectCharacter"))
                    .font(.system(size: DesignTokens.FontSize.lg, weight: .semibold))
                    .foregroundStyle(DesignTokens.Text.primary)

                if characters.isEmpty {
                    Text(localization.t("player.dialogue.noCharactersAvailable"))
                        .font(.system(size: DesignTokens.FontSize.base))
                        .foregroundStyle(DesignTokens.Text.muted)
                        .padding(.vertical, DesignTokens.Spacing.xl)
                } else {
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: DesignTokens.Spacing.lg) {
                            ForEach(characters) { character in
                                characterCell(character)
                            }
                        }
                        .padding(.horizontal, DesignTokens.Spacing.base)
                    }
                }

                GlassButton(
                    localization.t("common.cancel"),
                    variant: .ghost
                ) {
                    onDismiss()
                }
            }
            .padding(DesignTokens.Spacing.xl)
        }

        private func characterCell(_ character: ContentCharacter) -> some View {
            Button {
                onSelect(character)
            } label: {
                VStack(spacing: DesignTokens.Spacing.sm) {
                    CachedAsyncImage(url: URL(string: character.frameUrl)) { phase in
                        switch phase {
                        case let .success(image):
                            image.resizable().scaledToFill()
                        default:
                            Color.gray.opacity(0.3)
                        }
                    }
                    .frame(width: 80, height: 80)
                    .clipShape(Circle())
                    .overlay(
                        Circle().stroke(
                            DesignTokens.Primary.p400, lineWidth: 2
                        )
                    )
                    .shadow(
                        color: DesignTokens.Primary.default.opacity(0.3),
                        radius: 8, x: 0, y: 2
                    )

                    Text(character.name)
                        .font(.system(
                            size: DesignTokens.FontSize.sm, weight: .medium
                        ))
                        .foregroundStyle(DesignTokens.Text.primary)
                        .lineLimit(1)
                        .frame(maxWidth: 90)
                }
            }
            .buttonStyle(.plain)
        }
    }
#endif
