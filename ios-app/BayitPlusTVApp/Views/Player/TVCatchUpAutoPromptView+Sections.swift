#if os(tvOS)
    import BayitDesignSystem
    import BayitLocalization
    import SwiftUI

    // MARK: - Countdown & Action Buttons

    extension TVCatchUpAutoPromptView {
        var countdownProgress: some View {
            VStack(spacing: TVDesignTokens.Spacing.xs) {
                GeometryReader { geo in
                    ZStack(alignment: .leading) {
                        RoundedRectangle(cornerRadius: 3)
                            .fill(Color.white.opacity(0.1))
                            .frame(height: 6)

                        RoundedRectangle(cornerRadius: 3)
                            .fill(DesignTokens.Primary.p400)
                            .frame(
                                width: geo.size.width * progressFraction,
                                height: 6
                            )
                            .animation(
                                .linear(duration: 1),
                                value: secondsRemaining
                            )
                    }
                }
                .frame(height: 6)

                Text("\(secondsRemaining)s")
                    .font(.system(
                        size: TVDesignTokens.FontSize.sm,
                        design: .monospaced
                    ))
                    .foregroundStyle(DesignTokens.Text.muted)
            }
        }

        var actionButtons: some View {
            HStack(spacing: TVDesignTokens.Spacing.lg) {
                GlassButton(
                    localization.t(
                        "catchup.overlay.acceptButton",
                        ["cost": String(creditCost)]
                    ),
                    variant: .primary,
                    size: .large
                ) {
                    countdownTask?.cancel()
                    onAccept()
                }
                .tvFocusStyle()

                GlassButton(
                    localization.t("catchup.overlay.declineButton"),
                    variant: .secondary,
                    size: .large
                ) {
                    countdownTask?.cancel()
                    onDecline()
                }
                .tvFocusStyle()
            }
        }

        func startCountdown() {
            countdownTask = Task {
                while secondsRemaining > 0, !Task.isCancelled {
                    try? await Task.sleep(for: .seconds(1))
                    guard !Task.isCancelled else { return }
                    secondsRemaining -= 1
                }
                guard !Task.isCancelled else { return }
                onDecline()
            }
        }
    }
#endif
