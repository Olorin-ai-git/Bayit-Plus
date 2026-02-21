#if os(tvOS)
    import BayitDesignSystem
    import BayitLocalization
    import SwiftUI

    /// tvOS multi-character selection row with focus-based navigation.
    /// Larger circles (96pt) for 10-foot UI.
    struct TVMultiCharacterCirclesView: View {
        @Environment(LocalizationManager.self) private var localization

        let characters: [CharacterProfile]
        let addressedCharacter: String
        let onSelectCharacter: (String) -> Void

        private let circleSize: CGFloat = 96

        var body: some View {
            VStack(spacing: TVDesignTokens.Spacing.sm) {
                Text(
                    localization.t("player.multiCharacter.selectCharacter")
                )
                .font(.system(size: TVDesignTokens.FontSize.sm))
                .foregroundStyle(DesignTokens.Text.muted)

                HStack(spacing: TVDesignTokens.Spacing.lg) {
                    ForEach(characters) { character in
                        characterButton(character)
                    }
                }
            }
        }

        private func characterButton(
            _ character: CharacterProfile
        ) -> some View {
            let isActive = character.name == addressedCharacter

            return Button {
                onSelectCharacter(character.name)
            } label: {
                VStack(spacing: TVDesignTokens.Spacing.xs) {
                    CachedAsyncImage(url: URL(string: character.frameUrl)) { phase in
                        switch phase {
                        case let .success(image):
                            image.resizable().scaledToFill()
                        default:
                            Color.gray.opacity(0.3)
                        }
                    }
                    .frame(width: circleSize, height: circleSize)
                    .clipShape(Circle())
                    .overlay(
                        Circle().stroke(
                            isActive
                                ? DesignTokens.Primary.default
                                : .white.opacity(0.2),
                            lineWidth: isActive ? 4 : 2
                        )
                    )
                    .shadow(
                        color: isActive
                            ? DesignTokens.Primary.default.opacity(0.5)
                            : .clear,
                        radius: isActive ? 12 : 0
                    )

                    Text(character.name)
                        .font(.system(size: TVDesignTokens.FontSize.sm))
                        .foregroundStyle(
                            isActive
                                ? DesignTokens.Text.primary
                                : DesignTokens.Text.muted
                        )
                        .lineLimit(1)
                }
            }
            .accessibilityLabel(
                localization.t("player.multiCharacter.talkingTo")
                    + " " + character.name
            )
        }
    }
#endif
