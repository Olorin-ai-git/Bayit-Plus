#if os(iOS)
import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Displays a row of character circles for multi-character interaction.
/// The addressed character glows; tap to switch addressed character.
struct MultiCharacterCirclesView: View {

    @Environment(LocalizationManager.self) private var localization

    let characters: [CharacterProfile]
    let addressedCharacter: String
    let onSelectCharacter: (String) -> Void

    private let circleSize: CGFloat = 64

    var body: some View {
        VStack(spacing: DesignTokens.Spacing.xs) {
            Text(
                localization.t("player.multiCharacter.selectCharacter")
            )
            .font(.system(size: DesignTokens.FontSize.xs))
            .foregroundStyle(DesignTokens.Text.muted)

            HStack(spacing: DesignTokens.Spacing.md) {
                ForEach(characters) { character in
                    characterCircle(character)
                }
            }
        }
    }

    private func characterCircle(
        _ character: CharacterProfile
    ) -> some View {
        let isActive = character.name == addressedCharacter

        return Button {
            onSelectCharacter(character.name)
        } label: {
            VStack(spacing: DesignTokens.Spacing.xxs) {
                AsyncImage(url: URL(string: character.frameUrl)) { phase in
                    switch phase {
                    case .success(let image):
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
                        lineWidth: isActive ? 3 : 1
                    )
                )
                .shadow(
                    color: isActive
                        ? DesignTokens.Primary.default.opacity(0.5)
                        : .clear,
                    radius: isActive ? 8 : 0
                )

                Text(character.name)
                    .font(.system(size: DesignTokens.FontSize.xs))
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
