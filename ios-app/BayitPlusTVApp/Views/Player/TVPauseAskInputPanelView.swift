#if os(tvOS)
    import BayitDesignSystem
    import BayitLocalization
    import SwiftUI

    /// tvOS input panel for Pause & Ask questions.
    /// Displays character name, text field, and send/resume buttons.
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
                    .disabled(isSending)

                    HStack(spacing: TVDesignTokens.Spacing.md) {
                        Button(localization.t("common.send")) {
                            onSend()
                        }
                        .buttonStyle(.card)
                        .disabled(messageText.isEmpty || isSending)

                        Button(localization.t("player.pauseAsk.resumeMovie")) {
                            onDismiss()
                        }
                        .buttonStyle(.card)
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
