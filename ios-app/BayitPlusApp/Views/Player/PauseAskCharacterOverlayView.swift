#if os(iOS)
    import BayitCore
    import BayitDesignSystem
    import BayitLocalization
    import SwiftUI

    /// Tappable character circles overlaid on the paused video frame.
    /// Users select which character to talk to during a Pause & Ask interaction.
    struct PauseAskCharacterOverlayView: View {
        @Environment(LocalizationManager.self) private var localization
        @Environment(TooltipManager.self) private var tooltipManager

        let characters: [ContentCharacter]
        let onSelectCharacter: (ContentCharacter) -> Void
        let onDismiss: () -> Void

        private let circleSize: CGFloat = 100

        var body: some View {
            VStack(spacing: DesignTokens.Spacing.lg) {
                Spacer()

                Text(localization.t("player.pauseAsk.selectCharacter"))
                    .font(.system(
                        size: DesignTokens.FontSize.md, weight: .semibold
                    ))
                    .foregroundStyle(DesignTokens.Text.primary)
                    .featureTooltip(
                        featureKey: "vod_pause_ask",
                        titleKey: "tooltip.pauseAndAsk.title",
                        descriptionKey: "tooltip.pauseAndAsk.description",
                        arrowDirection: .bottom,
                        tooltipManager: tooltipManager
                    )

                characterGrid

                GlassButton(
                    localization.t("player.pauseAsk.resumeMovie"),
                    variant: .secondary, size: .small
                ) { onDismiss() }

                Spacer()
            }
            .padding(DesignTokens.Spacing.lg)
        }

        // MARK: - Character Grid

        private var characterGrid: some View {
            LazyVGrid(
                columns: gridColumns,
                spacing: DesignTokens.Spacing.lg
            ) {
                ForEach(characters) { character in
                    characterCircle(character)
                }
            }
            .frame(maxWidth: 400)
        }

        private var gridColumns: [GridItem] {
            let count = min(characters.count, 3)
            return Array(
                repeating: GridItem(.flexible(), spacing: DesignTokens.Spacing.md),
                count: count
            )
        }

        private func characterCircle(
            _ character: ContentCharacter
        ) -> some View {
            Button { onSelectCharacter(character) } label: {
                VStack(spacing: DesignTokens.Spacing.xs) {
                    CachedAsyncImage(url: URL(string: character.frameUrl)) { phase in
                        switch phase {
                        case let .success(image):
                            image.resizable().scaledToFill()
                        default:
                            Color.black.opacity(0.3)
                        }
                    }
                    .frame(width: circleSize, height: circleSize)
                    .clipShape(Circle())
                    .overlay(
                        Circle()
                            .stroke(
                                DesignTokens.Primary.default.opacity(0.6),
                                lineWidth: 3
                            )
                    )
                    .shadow(
                        color: DesignTokens.Primary.default.opacity(0.3),
                        radius: 8, x: 0, y: 4
                    )
                    .pulseAnimation()

                    Text(character.name)
                        .font(.system(
                            size: DesignTokens.FontSize.sm, weight: .medium
                        ))
                        .foregroundStyle(DesignTokens.Text.primary)
                        .lineLimit(1)
                }
            }
            .buttonStyle(.plain)
        }
    }

    // MARK: - Pulse Animation

    private struct PulseModifier: ViewModifier {
        @State private var isPulsing = false

        func body(content: Content) -> some View {
            content
                .scaleEffect(isPulsing ? 1.05 : 1.0)
                .animation(
                    .easeInOut(duration: 1.5).repeatForever(autoreverses: true),
                    value: isPulsing
                )
                .onAppear { isPulsing = true }
        }
    }

    extension View {
        func pulseAnimation() -> some View {
            modifier(PulseModifier())
        }
    }
#endif
