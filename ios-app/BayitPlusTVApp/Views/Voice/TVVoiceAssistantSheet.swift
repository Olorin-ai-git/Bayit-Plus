#if os(tvOS)
    import BayitCore
    import BayitDesignSystem
    import BayitLocalization
    import BayitVoice
    import SwiftUI

    /// tvOS voice assistant modal with both text input and Siri Remote microphone.
    struct TVVoiceAssistantSheet: View {
        @Environment(LocalizationManager.self) var localization
        let chatRepository: any ChatRepository
        let onDismiss: () -> Void

        @State var inputText = ""
        @State var aiResponse = ""
        @State var isProcessing = false
        @State var isRecording = false
        @State var isTranscribing = false
        @State var errorMessage: String?
        @FocusState var isInputFocused: Bool

        let audioService = TVAudioRecordingService()
        let logger = BayitLogger(category: "TVVoiceAssistantSheet")

        var body: some View {
            ZStack {
                DesignTokens.Background.primary.ignoresSafeArea()

                VStack(spacing: TVDesignTokens.Spacing.xl) {
                    header
                    Spacer()
                    queryOrb
                    Spacer()
                    conversationArea
                    textInputBar
                }
                .padding(.horizontal, TVDesignTokens.Spacing.xl)
                .padding(.vertical, TVDesignTokens.Spacing.lg)
            }
        }

        // MARK: - Header

        private var header: some View {
            HStack {
                Text(localization.t("voice.title"))
                    .font(.system(size: TVDesignTokens.FontSize.xl, weight: .semibold))
                    .foregroundStyle(DesignTokens.Text.primary)

                Spacer()

                GlassButton("Close", variant: .secondary, size: .small) {
                    if isRecording { audioService.cancelRecording() }
                    onDismiss()
                }
                .tvFocusStyle()
            }
        }

        // MARK: - Conversation Area

        var conversationArea: some View {
            VStack(spacing: TVDesignTokens.Spacing.md) {
                if let error = errorMessage {
                    Text(error)
                        .font(.system(size: TVDesignTokens.FontSize.sm))
                        .foregroundStyle(DesignTokens.ErrorColor.default)
                        .multilineTextAlignment(.center)
                }

                if !inputText.isEmpty || !aiResponse.isEmpty {
                    if !aiResponse.isEmpty {
                        HStack {
                            Text(aiResponse)
                                .font(.system(size: TVDesignTokens.FontSize.base))
                                .foregroundStyle(DesignTokens.Text.primary)
                                .padding(TVDesignTokens.Spacing.md)
                                .background(DesignTokens.Glass.bgMedium)
                                .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md))
                            Spacer()
                        }
                    }
                }

                if isRecording {
                    Text(localization.t("voice.listening"))
                        .font(.system(size: TVDesignTokens.FontSize.base))
                        .foregroundStyle(Color.red)
                } else if isTranscribing {
                    Text(localization.t("voice.processing"))
                        .font(.system(size: TVDesignTokens.FontSize.base))
                        .foregroundStyle(DesignTokens.Text.muted)
                } else if isProcessing {
                    Text(localization.t("voice.thinking"))
                        .font(.system(size: TVDesignTokens.FontSize.base))
                        .foregroundStyle(DesignTokens.Text.muted)
                }
            }
            .frame(minHeight: 80)
        }

        // MARK: - Text Input Bar

        var textInputBar: some View {
            HStack(spacing: TVDesignTokens.Spacing.md) {
                microphoneButton

                TextField(localization.t("voice.tapToSpeak"), text: $inputText)
                    .font(.system(size: TVDesignTokens.FontSize.base))
                    .foregroundStyle(DesignTokens.Text.primary)
                    .focused($isInputFocused)
                    .submitLabel(.send)
                    .onSubmit { processQuery() }

                GlassButton("Ask", variant: .primary, size: .medium) {
                    processQuery()
                }
                .tvFocusStyle()
                .disabled(
                    inputText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
                        || isProcessing || isTranscribing
                )
            }
            .padding(TVDesignTokens.Spacing.md)
            .background(DesignTokens.Glass.bgMedium)
            .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg))
        }
    }
#endif
