#if os(tvOS)
    import BayitDesignSystem
    import BayitLocalization
    import SwiftUI

    /// tvOS input panel for Pause & Ask questions.
    /// Displays character name, glass-themed text field, and action buttons.
    struct TVPauseAskInputPanelView: View {
        @Environment(LocalizationManager.self) private var localization
        @FocusState private var isInputFocused: Bool

        let characterName: String?
        @Binding var messageText: String
        let isSending: Bool
        let onSend: () -> Void
        let onDismiss: () -> Void

        var body: some View {
            VStack {
                Spacer()
                VStack(spacing: TVDesignTokens.Spacing.lg) {
                    if let name = characterName {
                        Text(name)
                            .font(.system(
                                size: TVDesignTokens.FontSize.lg,
                                weight: .semibold
                            ))
                            .foregroundStyle(DesignTokens.Text.primary)
                    }

                    TextField(
                        localization.t("player.dialogue.typeQuestion"),
                        text: $messageText
                    )
                    .focused($isInputFocused)
                    .textFieldStyle(.plain)
                    .font(.system(size: TVDesignTokens.FontSize.md))
                    .foregroundStyle(DesignTokens.Text.primary)
                    .tint(DesignTokens.Primary.default)
                    .disabled(isSending)
                    .accessibilityLabel(
                        localization.t("player.dialogue.typeQuestion")
                    )
                    .padding(.horizontal, TVDesignTokens.Spacing.lg)
                    .padding(.vertical, TVDesignTokens.Spacing.md)
                    .background(DesignTokens.Glass.bgStrong)
                    .clipShape(
                        RoundedRectangle(
                            cornerRadius: TVDesignTokens.Radius.md
                        )
                    )
                    .overlay(
                        RoundedRectangle(
                            cornerRadius: TVDesignTokens.Radius.md
                        )
                        .stroke(
                            isInputFocused
                                ? DesignTokens.Glass.borderFocus
                                : DesignTokens.Glass.border,
                            lineWidth: isInputFocused
                                ? TVDesignTokens.Focus.ringWidth : 1
                        )
                    )
                    .animation(
                        .easeInOut(duration: 0.2), value: isInputFocused
                    )

                    HStack(spacing: TVDesignTokens.Spacing.md) {
                        GlassButton(
                            localization.t("common.send"),
                            variant: .primary,
                            size: .large,
                            isDisabled: messageText.isEmpty || isSending
                        ) { onSend() }

                        GlassButton(
                            localization.t("player.pauseAsk.resumeMovie"),
                            variant: .secondary,
                            size: .large
                        ) { onDismiss() }
                    }
                }
                .padding(TVDesignTokens.Spacing.xl)
                .background(DesignTokens.Glass.bgMedium)
                .clipShape(
                    RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg)
                )
                .overlay(
                    RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg)
                        .stroke(DesignTokens.Glass.border, lineWidth: 1)
                )
                .frame(maxWidth: 600)
                .padding(TVDesignTokens.Spacing.xxl)
            }
            .onAppear { isInputFocused = true }
        }
    }
#endif
