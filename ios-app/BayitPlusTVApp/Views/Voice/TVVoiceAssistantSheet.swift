#if os(tvOS)
import BayitCore
import BayitDesignSystem
import BayitLocalization
import BayitVoice
import SwiftUI

/// tvOS voice assistant modal with both text input and Siri Remote microphone.
struct TVVoiceAssistantSheet: View {

    @Environment(LocalizationManager.self) private var localization
    let chatRepository: any ChatRepository
    let onDismiss: () -> Void

    @State private var inputText = ""
    @State private var aiResponse = ""
    @State private var isProcessing = false
    @State private var isRecording = false
    @State private var isTranscribing = false
    @State private var errorMessage: String?
    @FocusState private var isInputFocused: Bool

    private let audioService = TVAudioRecordingService()
    private let logger = BayitLogger(category: "TVVoiceAssistantSheet")

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

    // MARK: - Query Orb

    private var queryOrb: some View {
        ZStack {
            Circle()
                .stroke(orbColor.opacity(0.2), lineWidth: 2)
                .frame(width: 200, height: 200)
                .scaleEffect(isAnimating ? 1.1 : 1.0)
                .animation(
                    isAnimating
                        ? .easeInOut(duration: 1.2).repeatForever(autoreverses: true)
                        : .easeInOut(duration: 0.4),
                    value: isAnimating
                )

            Circle()
                .fill(orbColor.opacity(0.15))
                .frame(width: 150, height: 150)

            Circle()
                .fill(
                    RadialGradient(
                        colors: [orbColor.opacity(0.8), orbColor.opacity(0.3)],
                        center: .center,
                        startRadius: 0,
                        endRadius: 55
                    )
                )
                .frame(width: 110, height: 110)

            stateIcon
        }
        .animation(.spring(response: 0.5, dampingFraction: 0.7), value: isRecording)
        .animation(.spring(response: 0.5, dampingFraction: 0.7), value: isProcessing)
    }

    private var isAnimating: Bool {
        isRecording || isProcessing || isTranscribing
    }

    @ViewBuilder
    private var stateIcon: some View {
        if isRecording {
            Image(systemName: "waveform")
                .font(.system(size: TVDesignTokens.FontSize.xl, weight: .medium))
                .foregroundStyle(DesignTokens.Text.primary)
                .symbolEffect(.variableColor, options: .repeating, value: isRecording)
        } else if isTranscribing || isProcessing {
            ProgressView()
                .tint(DesignTokens.Text.primary)
                .scaleEffect(1.5)
        } else if !aiResponse.isEmpty {
            Image(systemName: "checkmark")
                .font(.system(size: TVDesignTokens.FontSize.xl, weight: .medium))
                .foregroundStyle(DesignTokens.Text.primary)
        } else {
            Image(systemName: "mic")
                .font(.system(size: TVDesignTokens.FontSize.xl, weight: .medium))
                .foregroundStyle(DesignTokens.Text.primary)
        }
    }

    private var orbColor: Color {
        if isRecording { return Color.red }
        if isTranscribing { return DesignTokens.Primary.p400 }
        if isProcessing { return DesignTokens.Warning.default }
        if !aiResponse.isEmpty { return DesignTokens.Success.default }
        return DesignTokens.Primary.p400
    }

    // MARK: - Conversation Area

    private var conversationArea: some View {
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

    private var textInputBar: some View {
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

    // MARK: - Microphone Button

    private var microphoneButton: some View {
        Button {
            Task { await toggleRecording() }
        } label: {
            ZStack {
                Circle()
                    .fill(isRecording ? Color.red.opacity(0.2) : DesignTokens.Glass.bgLight)
                    .frame(width: 60, height: 60)

                if isRecording {
                    Circle()
                        .stroke(Color.red, lineWidth: 3)
                        .frame(width: 60, height: 60)
                        .scaleEffect(isRecording ? 1.15 : 1.0)
                        .opacity(isRecording ? 0.6 : 1.0)
                        .animation(
                            .easeInOut(duration: 0.8).repeatForever(autoreverses: true),
                            value: isRecording
                        )
                }

                Image(systemName: isRecording ? "mic.fill" : "mic")
                    .font(.system(size: 24))
                    .foregroundStyle(
                        isRecording ? Color.red : DesignTokens.Text.primary
                    )
            }
        }
        .buttonStyle(.plain)
        .tvFocusStyle()
        .disabled(isProcessing || isTranscribing)
        .accessibilityLabel(isRecording ? "Stop recording" : "Start voice input")
        .accessibilityHint("Press to use Siri Remote microphone")
    }

    // MARK: - Actions

    private func toggleRecording() async {
        if isRecording {
            await stopRecordingAndTranscribe()
        } else {
            startRecording()
        }
    }

    private func startRecording() {
        errorMessage = nil
        aiResponse = ""

        do {
            try audioService.startRecording()
            isRecording = true
            logger.info("Voice assistant recording started")
        } catch {
            errorMessage = "Microphone access unavailable"
            logger.error("Failed to start recording", error: error)
        }
    }

    private func stopRecordingAndTranscribe() async {
        let audioData = audioService.stopRecording()
        isRecording = false

        guard !audioData.isEmpty else {
            errorMessage = "No audio captured"
            return
        }

        isTranscribing = true
        do {
            let transcribeResult = try await chatRepository.transcribeAudio(
                data: audioData, language: nil
            )
            if let transcription = transcribeResult.text, !transcription.isEmpty {
                inputText = transcription
                isTranscribing = false
                processQuery()
            } else {
                isTranscribing = false
                errorMessage = "Could not transcribe audio"
            }
        } catch {
            isTranscribing = false
            errorMessage = "Transcription failed"
            logger.error("Transcription failed", error: error)
        }
    }

    private func processQuery() {
        let text = inputText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty else { return }

        errorMessage = nil
        aiResponse = ""
        isProcessing = true
        let userMessage = text
        inputText = ""

        Task {
            do {
                let request = ChatRequest(
                    message: userMessage,
                    conversationId: nil,
                    context: "voice_assistant",
                    language: nil
                )
                let response = try await chatRepository.sendMessage(request)
                aiResponse = response.response ?? ""
            } catch {
                errorMessage = "Could not get a response"
            }
            isProcessing = false
        }
    }
}
#endif
