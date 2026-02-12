import AVFoundation
import BayitDesignSystem
import BayitLocalization
import Speech
import SwiftUI

struct VoiceDecisionView: View {
    @Environment(LocalizationManager.self) private var localization

    let promptText: String
    let promptTransliteration: String
    let promptTranslation: String
    let timeoutSeconds: Int
    let maxAttempts: Int
    let currentAttempt: Int
    let hint: String?
    let onSubmitTranscript: (String) -> Void

    @State private var countdown: Int = 0
    @State private var isListening = false
    @State private var recognizer: SFSpeechRecognizer?
    @State private var engine: AVAudioEngine?
    @State private var recTask: SFSpeechRecognitionTask?
    @State private var timer: Timer?

    var body: some View {
        ZStack {
            Color.black.opacity(0.85).ignoresSafeArea()

            VStack(spacing: 24) {
                promptCard
                micSection
                attemptLabel

                if let hint = hint, !hint.isEmpty {
                    Text(hint)
                        .font(.system(size: 14))
                        .foregroundColor(DesignTokens.Color.warning)
                        .multilineTextAlignment(.center)
                }
            }
            .padding(32)
        }
        .onAppear { setup() }
        .onDisappear { cleanup() }
    }

    private var promptCard: some View {
        VStack(spacing: 8) {
            Text(promptText)
                .font(.system(size: 28, weight: .bold))
                .foregroundColor(.white)
                .multilineTextAlignment(.center)

            if !promptTransliteration.isEmpty {
                Text(promptTransliteration)
                    .font(.system(size: 16))
                    .foregroundColor(.white.opacity(0.5))
            }

            if !promptTranslation.isEmpty {
                Text(promptTranslation)
                    .font(.system(size: 14))
                    .foregroundColor(.white.opacity(0.35))
            }
        }
        .padding(28)
        .frame(maxWidth: .infinity)
        .background(.white.opacity(0.08))
        .clipShape(RoundedRectangle(cornerRadius: 20))
        .overlay(
            RoundedRectangle(cornerRadius: 20)
                .stroke(.white.opacity(0.12), lineWidth: 1)
        )
    }

    private var micSection: some View {
        VStack(spacing: 12) {
            Text("\(countdown)")
                .font(.system(size: 48, weight: .heavy))
                .foregroundColor(DesignTokens.Color.warning)

            Button {
                if isListening { stopListening() } else { startListening() }
            } label: {
                ZStack {
                    Circle()
                        .fill(isListening ? Color.red.opacity(0.5) : Color.red.opacity(0.2))
                        .frame(width: 72, height: 72)
                        .overlay(
                            Circle().stroke(
                                isListening ? Color.red : Color.red.opacity(0.6),
                                lineWidth: 2
                            )
                        )
                    Image(systemName: isListening ? "mic.slash.fill" : "mic.fill")
                        .font(.system(size: 28))
                        .foregroundColor(.red)
                }
            }
        }
    }

    private var attemptLabel: some View {
        Text(localization.t("voiceDecision.attempt")
            .replacingOccurrences(of: "{{current}}", with: "\(currentAttempt)")
            .replacingOccurrences(of: "{{max}}", with: "\(maxAttempts)")
        )
        .font(.system(size: 12))
        .foregroundColor(.white.opacity(0.4))
    }

    private func setup() {
        recognizer = SFSpeechRecognizer(locale: Locale(identifier: "he-IL"))
        engine = AVAudioEngine()
        countdown = timeoutSeconds

        timer = Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { _ in
            if countdown > 0 { countdown -= 1 }
            else { timer?.invalidate() }
        }

        SFSpeechRecognizer.requestAuthorization { _ in }
    }

    private func startListening() {
        guard let recognizer = recognizer, recognizer.isAvailable,
              let engine = engine else { return }
        isListening = true

        let request = SFSpeechAudioBufferRecognitionRequest()
        request.shouldReportPartialResults = false

        let inputNode = engine.inputNode
        let format = inputNode.outputFormat(forBus: 0)
        inputNode.installTap(onBus: 0, bufferSize: 1024, format: format) { buffer, _ in
            request.append(buffer)
        }

        do { try engine.start() } catch { return }

        recTask = recognizer.recognitionTask(with: request) { result, _ in
            if let result = result, result.isFinal {
                stopListening()
                onSubmitTranscript(result.bestTranscription.formattedString)
            }
        }
    }

    private func stopListening() {
        engine?.stop()
        engine?.inputNode.removeTap(onBus: 0)
        recTask?.cancel()
        recTask = nil
        isListening = false
    }

    private func cleanup() {
        timer?.invalidate()
        stopListening()
    }
}
