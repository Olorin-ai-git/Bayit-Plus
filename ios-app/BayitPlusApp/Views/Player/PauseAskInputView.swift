#if os(iOS)
    import BayitDesignSystem
    import BayitLocalization
    import SwiftUI

    // MARK: - PauseAskDialogueOverlayView Input Panel Extensions

    extension PauseAskDialogueOverlayView {
        var inputPanel: some View {
            VStack {
                Spacer()
                GlassCard(
                    radius: DesignTokens.Radius.lg,
                    padding: DesignTokens.Spacing.md
                ) {
                    VStack(spacing: DesignTokens.Spacing.md) {
                        inputHeader
                        DialogueInputView(
                            messageText: $messageText,
                            isSending: viewModel.isSending,
                            voiceService: voiceService,
                            inputMode: inputMode,
                            onToggleMode: {
                                inputMode = inputMode == .text ? .voice : .text
                            },
                            onSend: { sendQuestion() },
                            onVoiceRecorded: { audioData in
                                transcribeAndSend(audioData: audioData)
                            }
                        )
                    }
                }
                .frame(maxWidth: 400)
                .padding(DesignTokens.Spacing.lg)
            }
        }

        var inputHeader: some View {
            HStack {
                if let name = viewModel.selectedCharacter?.name {
                    Text(name)
                        .font(.system(
                            size: DesignTokens.FontSize.md, weight: .semibold
                        ))
                        .foregroundStyle(DesignTokens.Text.primary)
                }
                Spacer()

                if voiceService != nil {
                    Button {
                        inputMode = inputMode == .text ? .voice : .text
                    } label: {
                        Image(systemName: inputMode == .voice
                            ? "keyboard" : "mic.fill")
                            .font(.system(size: 18))
                            .foregroundStyle(DesignTokens.Text.secondary)
                    }
                }

                Button { onDismiss() } label: {
                    Image(systemName: "xmark.circle.fill")
                        .font(.system(size: 22))
                        .foregroundStyle(DesignTokens.Text.muted)
                }
            }
        }
    }
#endif
