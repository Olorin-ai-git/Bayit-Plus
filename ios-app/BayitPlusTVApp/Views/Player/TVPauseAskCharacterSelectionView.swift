#if os(tvOS)
    import BayitCore
    import BayitDesignSystem
    import BayitLocalization
    import SwiftUI

    /// Focus-based character selection for tvOS Pause & Ask.
    /// Floating 160pt circles at the bottom of the screen over the paused movie.
    /// Uses `.focusable()` + `.onTapGesture` to avoid the tvOS system card effect.
    struct TVPauseAskCharacterSelectionView: View {
        @Environment(LocalizationManager.self) private var localization

        let characters: [ContentCharacter]
        let onSelectCharacter: (ContentCharacter) -> Void
        let onDismiss: () -> Void

        @FocusState private var focusedIndex: Int?

        private let circleSize: CGFloat = 160

        var body: some View {
            VStack(spacing: 0) {
                Spacer()

                VStack(spacing: TVDesignTokens.Spacing.lg) {
                    Text(localization.t("player.pauseAsk.selectCharacter"))
                        .font(.system(size: TVDesignTokens.FontSize.lg, weight: .bold))
                        .foregroundStyle(DesignTokens.Text.primary)

                    if characters.isEmpty {
                        Text(localization.t("player.pauseAsk.noCharacters"))
                            .font(.system(size: TVDesignTokens.FontSize.md))
                            .foregroundStyle(DesignTokens.Text.secondary)
                            .multilineTextAlignment(.center)
                            .padding(.horizontal, TVDesignTokens.Spacing.xxl)
                    } else {
                        HStack(spacing: TVDesignTokens.Spacing.xl) {
                            ForEach(
                                Array(characters.enumerated()), id: \.element.id
                            ) { index, character in
                                characterItem(character, index: index)
                            }
                        }
                    }

                    dismissItem
                }
                .padding(.horizontal, TVDesignTokens.Spacing.xxl)
                .padding(.bottom, TVDesignTokens.Spacing.xxl)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        }

        // MARK: - Character Item (.plain style avoids card effect; Button responds to Siri Remote select)

        private func characterItem(
            _ character: ContentCharacter, index: Int
        ) -> some View {
            Button { onSelectCharacter(character) } label: {
                CharacterCircleLabel(character: character, circleSize: circleSize)
            }
            .buttonStyle(.plain)
            .focused($focusedIndex, equals: index)
        }

        // MARK: - Dismiss Item

        private var dismissItem: some View {
            Button { onDismiss() } label: {
                DismissLabel(title: localization.t("player.pauseAsk.resumeMovie"))
            }
            .buttonStyle(.plain)
            .focused($focusedIndex, equals: characters.count)
        }
    }

    // MARK: - Character Circle Label

    private struct CharacterCircleLabel: View {
        let character: ContentCharacter
        let circleSize: CGFloat
        @Environment(\.isFocused) private var isFocused

        var body: some View {
            VStack(spacing: TVDesignTokens.Spacing.sm) {
                CachedAsyncImage(url: URL(string: character.frameUrl)) { phase in
                    switch phase {
                    case let .success(image):
                        image.resizable().scaledToFill()
                    default:
                        Color(white: 0.15)
                    }
                }
                .frame(width: circleSize, height: circleSize)
                .clipShape(Circle())
                .overlay(
                    Circle().stroke(
                        isFocused
                            ? DesignTokens.Glass.borderFocus
                            : Color.clear,
                        lineWidth: TVDesignTokens.Focus.ringWidth
                    )
                )
                .shadow(
                    color: isFocused
                        ? DesignTokens.Glass.purpleGlow : .clear,
                    radius: TVDesignTokens.Focus.shadowRadius,
                    x: 0, y: isFocused ? 8 : 0
                )
                .scaleEffect(
                    isFocused ? TVDesignTokens.Focus.scaleAmount : 1.0
                )
                .animation(
                    .spring(
                        duration: TVDesignTokens.Focus.animationDuration,
                        bounce: 0.2
                    ),
                    value: isFocused
                )

                Text(character.name)
                    .font(.system(
                        size: TVDesignTokens.FontSize.md,
                        weight: isFocused ? .bold : .medium
                    ))
                    .foregroundStyle(
                        isFocused
                            ? DesignTokens.Primary.p300
                            : DesignTokens.Text.primary
                    )
                    .animation(.easeInOut(duration: 0.2), value: isFocused)
            }
        }
    }

    // MARK: - Dismiss Label

    private struct DismissLabel: View {
        let title: String
        @Environment(\.isFocused) private var isFocused

        var body: some View {
            Text(title)
                .font(.system(size: TVDesignTokens.FontSize.md, weight: .medium))
                .foregroundStyle(
                    isFocused ? DesignTokens.Primary.p300 : DesignTokens.Text.secondary
                )
                .padding(.horizontal, TVDesignTokens.Spacing.xl)
                .padding(.vertical, TVDesignTokens.Spacing.md)
                .background(
                    Capsule().fill(
                        isFocused ? DesignTokens.Glass.bgStrong : DesignTokens.Glass.bg
                    )
                )
                .overlay(
                    Capsule().stroke(
                        isFocused
                            ? DesignTokens.Glass.borderFocus
                            : Color.clear,
                        lineWidth: TVDesignTokens.Focus.ringWidth
                    )
                )
                .shadow(
                    color: isFocused
                        ? DesignTokens.Glass.purpleGlow : .clear,
                    radius: TVDesignTokens.Focus.shadowRadius,
                    x: 0, y: isFocused ? 6 : 0
                )
                .scaleEffect(
                    isFocused ? TVDesignTokens.Focus.scaleAmount : 1.0
                )
                .animation(
                    .spring(
                        duration: TVDesignTokens.Focus.animationDuration,
                        bounce: 0.2
                    ),
                    value: isFocused
                )
        }
    }
#endif
