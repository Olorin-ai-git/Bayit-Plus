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
            CatchUpActionButtons(
                creditCost: creditCost,
                onAccept: {
                    countdownTask?.cancel()
                    onAccept()
                },
                onDecline: {
                    countdownTask?.cancel()
                    onDecline()
                }
            )
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

    // MARK: - Action Buttons (separate view for @FocusState)

    private struct CatchUpActionButtons: View {
        let creditCost: Int
        let onAccept: () -> Void
        let onDecline: () -> Void

        @Environment(LocalizationManager.self) private var localization
        @FocusState private var focusedButton: ButtonType?

        private enum ButtonType {
            case accept, decline
        }

        var body: some View {
            HStack(spacing: TVDesignTokens.Spacing.xl) {
                acceptButton
                declineButton
            }
            .onAppear { focusedButton = .accept }
        }

        private var acceptButton: some View {
            let isFocused = focusedButton == .accept
            return Button(action: onAccept) {
                HStack(spacing: TVDesignTokens.Spacing.sm) {
                    Image(systemName: "clock.arrow.circlepath")
                        .font(.system(
                            size: TVDesignTokens.FontSize.xs,
                            weight: .semibold
                        ))
                    Text(localization.t(
                        "catchup.overlay.acceptButton",
                        ["cost": String(creditCost)]
                    ))
                    .font(.system(
                        size: TVDesignTokens.FontSize.sm,
                        weight: .semibold
                    ))
                    .lineLimit(1)
                    .fixedSize(horizontal: true, vertical: false)
                }
                .foregroundStyle(.white)
                .padding(.horizontal, TVDesignTokens.Spacing.xxl)
                .padding(.vertical, TVDesignTokens.Spacing.md)
                .frame(minWidth: 300, minHeight: 64)
                .background(
                    isFocused
                        ? DesignTokens.Primary.default.opacity(0.6)
                        : DesignTokens.Primary.default.opacity(0.35)
                )
                .clipShape(
                    RoundedRectangle(
                        cornerRadius: TVDesignTokens.Radius.default
                    )
                )
                .overlay(
                    RoundedRectangle(
                        cornerRadius: TVDesignTokens.Radius.default
                    )
                    .stroke(
                        isFocused
                            ? DesignTokens.Glass.borderFocus
                            : DesignTokens.Primary.default.opacity(0.3),
                        lineWidth: isFocused
                            ? TVDesignTokens.Focus.ringWidth : 1
                    )
                )
                .shadow(
                    color: isFocused
                        ? DesignTokens.Glass.purpleGlow
                        : .clear,
                    radius: TVDesignTokens.Focus.shadowRadius,
                    x: 0, y: isFocused ? 4 : 0
                )
            }
            .buttonStyle(.card)
            .focused($focusedButton, equals: .accept)
            .scaleEffect(
                isFocused ? TVDesignTokens.Focus.scaleAmount : 1.0
            )
            .animation(.spring(duration: 0.2), value: isFocused)
        }

        private var declineButton: some View {
            let isFocused = focusedButton == .decline
            return Button(action: onDecline) {
                Text(localization.t("catchup.overlay.declineButton"))
                    .font(.system(
                        size: TVDesignTokens.FontSize.sm,
                        weight: .medium
                    ))
                    .foregroundStyle(
                        isFocused
                            ? DesignTokens.Text.primary
                            : DesignTokens.Text.secondary
                    )
                    .padding(.horizontal, TVDesignTokens.Spacing.xxl)
                    .padding(.vertical, TVDesignTokens.Spacing.md)
                    .frame(minWidth: 160, minHeight: 64)
                    .background(
                        isFocused
                            ? Color.white.opacity(0.15)
                            : Color.white.opacity(0.05)
                    )
                    .clipShape(
                        RoundedRectangle(
                            cornerRadius: TVDesignTokens.Radius.default
                        )
                    )
                    .overlay(
                        RoundedRectangle(
                            cornerRadius: TVDesignTokens.Radius.default
                        )
                        .stroke(
                            isFocused
                                ? DesignTokens.Glass.borderFocus
                                : DesignTokens.Glass.border,
                            lineWidth: isFocused
                                ? TVDesignTokens.Focus.ringWidth : 1
                        )
                    )
                    .shadow(
                        color: isFocused
                            ? DesignTokens.Glass.purpleGlow
                            : .clear,
                        radius: TVDesignTokens.Focus.shadowRadius,
                        x: 0, y: isFocused ? 4 : 0
                    )
            }
            .buttonStyle(.card)
            .focused($focusedButton, equals: .decline)
            .scaleEffect(
                isFocused ? TVDesignTokens.Focus.scaleAmount : 1.0
            )
            .animation(.spring(duration: 0.2), value: isFocused)
        }
    }
#endif
