import BayitDesignSystem
import BayitLocalization
import BayitVoice
import SwiftUI

/// Conversation area and speech recognition actions for the voice assistant sheet.
extension VoiceAssistantSheet {
    // MARK: - Conversation Area

    var conversationArea: some View {
        VStack(spacing: DesignTokens.Spacing.md) {
            if let error = errorMessage {
                Text(error)
                    .font(.system(size: DesignTokens.FontSize.sm))
                    .foregroundStyle(DesignTokens.ErrorColor.default)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, DesignTokens.Spacing.base)
            }

            if !transcript.isEmpty {
                HStack {
                    Spacer()
                    Text(transcript)
                        .font(.system(size: DesignTokens.FontSize.base))
                        .foregroundStyle(DesignTokens.Text.primary)
                        .padding(.horizontal, DesignTokens.Spacing.md)
                        .padding(.vertical, DesignTokens.Spacing.sm)
                        .background(DesignTokens.Glass.purpleStrong)
                        .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
                }
            }

            if !aiResponse.isEmpty {
                HStack {
                    Text(aiResponse)
                        .font(.system(size: DesignTokens.FontSize.base))
                        .foregroundStyle(DesignTokens.Text.primary)
                        .padding(.horizontal, DesignTokens.Spacing.md)
                        .padding(.vertical, DesignTokens.Spacing.sm)
                        .background(DesignTokens.Glass.bgMedium)
                        .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
                    Spacer()
                }
            }

            if isListening && transcript.isEmpty {
                Text(localization.t("voice.listening"))
                    .font(.system(size: DesignTokens.FontSize.md))
                    .foregroundStyle(DesignTokens.Text.muted)
                    .transition(.opacity)
            }

            if isProcessing {
                Text(localization.t("voice.thinking"))
                    .font(.system(size: DesignTokens.FontSize.md))
                    .foregroundStyle(DesignTokens.Text.muted)
                    .transition(.opacity)
            }
        }
        .frame(minHeight: 100)
        .animation(.easeInOut(duration: 0.2), value: transcript)
        .animation(.easeInOut(duration: 0.2), value: aiResponse)
    }

    // MARK: - Speech Recognition Actions

    func startListening() {
        errorMessage = nil
        aiResponse = ""
        transcript = ""
        isListening = true

        let languageCode = Locale.current.language.languageCode?.identifier ?? "en"

        Task {
            do {
                let (stream, stop) = try speechService.startRecognition(language: languageCode)
                stopClosure = stop

                for await result in stream {
                    transcript = result.transcription
                }
                // Stream ended naturally (user stopped speaking)
                if isListening {
                    isListening = false
                    processTranscript()
                }
            } catch {
                errorMessage = localization.t("errors.speechRecognitionFailed")
                isListening = false
            }
        }
    }

    func stopListeningAndProcess() {
        stopClosure?()
        stopClosure = nil
        isListening = false
        processTranscript()
    }

    func processTranscript() {
        guard !transcript.isEmpty else { return }

        isProcessing = true
        let userMessage = transcript

        Task {
            do {
                let request = ChatRequest(
                    message: userMessage,
                    conversationId: nil,
                    context: "voice_assistant",
                    language: Locale.current.language.languageCode?.identifier
                )
                let response = try await chatRepository.sendMessage(request)
                aiResponse = response.response ?? ""
            } catch {
                errorMessage = localization.t("errors.noResponse")
            }
            isProcessing = false
        }
    }

    func stopListeningIfNeeded() {
        if isListening {
            stopClosure?()
            stopClosure = nil
            isListening = false
        }
    }
}
