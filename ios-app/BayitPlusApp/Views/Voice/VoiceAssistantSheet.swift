import BayitDesignSystem
import BayitVoice
import SwiftUI
import UIKit

/// Voice assistant modal sheet - equivalent to the mobile web VoiceChatModal.
///
/// Presents a voice-first interface with speech recognition, animated waveform,
/// live transcript display, and AI response. Activated by the wizard hat FAB.
struct VoiceAssistantSheet: View {

    let chatRepository: any ChatRepository
    let onDismiss: () -> Void

    @State private var speechService = SpeechRecognitionService()
    @State private var stopClosure: (@Sendable () -> Void)?
    @State private var isListening = false
    @State private var transcript = ""
    @State private var aiResponse = ""
    @State private var isProcessing = false
    @State private var errorMessage: String?
    @State private var audioLevel: CGFloat = 0

    var body: some View {
        ZStack {
            DesignTokens.Background.primary.ignoresSafeArea()

            VStack(spacing: DesignTokens.Spacing.xl) {
                header

                Spacer()

                voiceOrb

                Spacer()

                conversationArea

                voiceButton

                Text("Tap outside or swipe down to close")
                    .font(.system(size: DesignTokens.FontSize.xs))
                    .foregroundStyle(DesignTokens.Text.muted)
                    .padding(.bottom, DesignTokens.Spacing.md)
            }
            .padding(.horizontal, DesignTokens.Spacing.lg)
            .padding(.top, DesignTokens.Spacing.lg)
        }
    }

    // MARK: - Header

    private var header: some View {
        HStack {
            Text("Voice Assistant")
                .font(.system(size: DesignTokens.FontSize.lg, weight: .semibold))
                .foregroundStyle(DesignTokens.Text.primary)

            Spacer()

            Button {
                stopListeningIfNeeded()
                onDismiss()
            } label: {
                Image(systemName: "xmark")
                    .font(.system(size: 16, weight: .medium))
                    .foregroundStyle(DesignTokens.Text.secondary)
                    .frame(width: 36, height: 36)
                    .background(DesignTokens.Glass.bgMedium)
                    .clipShape(Circle())
            }
            .accessibilityLabel("Close voice assistant")
        }
    }

    // MARK: - Voice Orb

    private var voiceOrb: some View {
        ZStack {
            Circle()
                .stroke(orbColor.opacity(0.2), lineWidth: 2)
                .frame(width: outerRingSize, height: outerRingSize)
                .scaleEffect(isListening ? 1.15 : 1.0)
                .animation(
                    isListening
                        ? .easeInOut(duration: 1.2).repeatForever(autoreverses: true)
                        : .easeInOut(duration: 0.4),
                    value: isListening
                )

            Circle()
                .fill(orbColor.opacity(0.15))
                .frame(width: 120, height: 120)
                .scaleEffect(isListening ? 1.0 + audioLevel * 0.3 : 1.0)
                .animation(.easeOut(duration: 0.1), value: audioLevel)

            Circle()
                .fill(
                    RadialGradient(
                        colors: [orbColor.opacity(0.8), orbColor.opacity(0.3)],
                        center: .center,
                        startRadius: 0,
                        endRadius: 45
                    )
                )
                .frame(width: 90, height: 90)

            stateIcon
        }
        .animation(.spring(response: 0.5, dampingFraction: 0.7), value: isListening)
        .animation(.spring(response: 0.5, dampingFraction: 0.7), value: isProcessing)
    }

    @ViewBuilder
    private var stateIcon: some View {
        if isProcessing {
            ProgressView()
                .tint(DesignTokens.Text.primary)
                .scaleEffect(1.3)
        } else if isListening {
            Image(systemName: "mic.fill")
                .font(.system(size: 32, weight: .medium))
                .foregroundStyle(DesignTokens.Text.primary)
        } else {
            Image(systemName: "waveform")
                .font(.system(size: 32, weight: .medium))
                .foregroundStyle(DesignTokens.Text.primary)
        }
    }

    private var orbColor: Color {
        if isProcessing {
            return DesignTokens.Warning.default
        } else if isListening {
            return DesignTokens.Primary.default
        } else if !aiResponse.isEmpty {
            return DesignTokens.Success.default
        } else {
            return DesignTokens.Primary.p400
        }
    }

    private var outerRingSize: CGFloat {
        if isListening { return 180 }
        if isProcessing { return 160 }
        return 170
    }

    // MARK: - Conversation Area

    private var conversationArea: some View {
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
                Text("Listening...")
                    .font(.system(size: DesignTokens.FontSize.md))
                    .foregroundStyle(DesignTokens.Text.muted)
                    .transition(.opacity)
            }

            if isProcessing {
                Text("Thinking...")
                    .font(.system(size: DesignTokens.FontSize.md))
                    .foregroundStyle(DesignTokens.Text.muted)
                    .transition(.opacity)
            }
        }
        .frame(minHeight: 100)
        .animation(.easeInOut(duration: 0.2), value: transcript)
        .animation(.easeInOut(duration: 0.2), value: aiResponse)
    }

    // MARK: - Voice Button

    private var voiceButton: some View {
        Button {
            handleVoiceButtonTap()
        } label: {
            ZStack {
                Circle()
                    .fill(voiceButtonColor)
                    .frame(width: 72, height: 72)

                Image(systemName: voiceButtonIcon)
                    .font(.system(size: 28, weight: .semibold))
                    .foregroundStyle(DesignTokens.Text.primary)
            }
        }
        .disabled(isProcessing)
        .accessibilityLabel(isListening ? "Stop listening" : "Start listening")
        .padding(.bottom, DesignTokens.Spacing.md)
    }

    private var voiceButtonColor: Color {
        isListening ? DesignTokens.ErrorColor.default : DesignTokens.Primary.default
    }

    private var voiceButtonIcon: String {
        isListening ? "stop.fill" : "mic.fill"
    }

    // MARK: - Actions

    private func handleVoiceButtonTap() {
        let generator = UIImpactFeedbackGenerator(style: .medium)
        generator.impactOccurred()

        if isListening {
            stopListeningAndProcess()
        } else {
            startListening()
        }
    }

    private func startListening() {
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
                errorMessage = "Could not start speech recognition"
                isListening = false
            }
        }
    }

    private func stopListeningAndProcess() {
        stopClosure?()
        stopClosure = nil
        isListening = false
        processTranscript()
    }

    private func processTranscript() {
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
                errorMessage = "Could not get a response"
            }
            isProcessing = false
        }
    }

    private func stopListeningIfNeeded() {
        if isListening {
            stopClosure?()
            stopClosure = nil
            isListening = false
        }
    }
}
