#if os(iOS)
    import BayitDesignSystem
    import BayitLocalization
    import SwiftUI

    /// Shared text/voice input component for dialogue overlays.
    /// Used by both AvatarDialogueOverlayView and PauseAskDialogueOverlayView.
    struct DialogueInputView: View {
        @Environment(LocalizationManager.self) private var localization

        @Binding var messageText: String
        let isSending: Bool
        let voiceService: VoiceInteractionService?
        let inputMode: InputMode
        let onToggleMode: () -> Void
        let onSend: () -> Void

        enum InputMode { case text, voice }

        var body: some View {
            if inputMode == .voice, let service = voiceService {
                voiceInputRow(service)
            } else {
                textInputRow
            }
        }

        // MARK: - Text Input

        private var textInputRow: some View {
            HStack(spacing: DesignTokens.Spacing.sm) {
                TextField(
                    localization.t("player.dialogue.typeQuestion"),
                    text: $messageText
                )
                .textFieldStyle(.plain)
                .font(.system(size: DesignTokens.FontSize.sm))
                .foregroundStyle(DesignTokens.Text.primary)
                .padding(.horizontal, DesignTokens.Spacing.sm)
                .padding(.vertical, DesignTokens.Spacing.xs)
                .background(DesignTokens.Glass.bgLight)
                .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
                .disabled(isSending)

                GlassButton(
                    isSending
                        ? localization.t("player.dialogue.sending")
                        : localization.t("common.send"),
                    variant: .primary, size: .small
                ) { onSend() }
                    .disabled(messageText.isEmpty || isSending)
            }
        }

        // MARK: - Voice Input

        private func voiceInputRow(
            _ service: VoiceInteractionService
        ) -> some View {
            HStack(spacing: DesignTokens.Spacing.md) {
                if service.isProcessing {
                    Text(localization.t(
                        "player.dialogue.\(service.processingStage ?? "thinking")"
                    ))
                    .font(.system(size: DesignTokens.FontSize.sm))
                    .foregroundStyle(DesignTokens.Text.secondary)
                }
                Spacer()
                Button {
                    if service.isRecording { service.stopRecording() }
                    else { service.startRecording() }
                } label: {
                    Image(systemName: service.isRecording
                        ? "stop.circle.fill" : "mic.circle.fill")
                        .font(.system(size: 44))
                        .foregroundStyle(service.isRecording
                            ? DesignTokens.ErrorColor.default
                            : DesignTokens.Primary.default)
                }
                .disabled(service.isProcessing)
                .accessibilityLabel(
                    localization.t("player.dialogue.holdToSpeak")
                )
            }
        }
    }
#endif
