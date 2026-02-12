import AVFoundation
import BayitCore
import BayitDesignSystem
import BayitLocalization
import SwiftUI

struct SceneTriggerView: View {
    @Environment(LocalizationManager.self) private var localization

    let targetWordHe: String
    let promptText: String
    let triggerType: String
    var onDismiss: (() -> Void)?
    var onSuccess: (() -> Void)?
    var onAudioCaptured: ((String) -> Void)?

    @State private var isRecording = false
    @State private var showSuccess = false
    @State private var showRetry = false
    @State private var correctTransliteration = ""
    @State private var audioRecorder: AVAudioRecorder?
    @State private var recordingURL: URL?
    @State private var error: String?

    private let logger = BayitLogger(category: "ZehAni")

    var body: some View {
        ZStack {
            DesignTokens.Background.primary.opacity(0.95)
                .ignoresSafeArea()

            VStack(spacing: 24) {
                if let error = error {
                    errorView(error)
                } else if !showSuccess && !showRetry {
                    promptCard
                    recordButton
                } else if showSuccess {
                    successView
                } else if showRetry {
                    retryView
                }
            }
            .padding(32)
        }
    }

    @ViewBuilder
    private func errorView(_ message: String) -> some View {
        VStack(spacing: 16) {
            Image(systemName: "exclamationmark.triangle.fill")
                .font(.system(size: 60))
                .foregroundColor(DesignTokens.Color.error)

            Text(message)
                .font(.system(size: 16))
                .foregroundColor(.white.opacity(0.8))
                .multilineTextAlignment(.center)

            Button(localization.t("zehAni.trigger.dismiss")) {
                onDismiss?()
            }
            .buttonStyle(.borderedProminent)
        }
    }

    @ViewBuilder
    private var promptCard: some View {
        VStack(spacing: 12) {
            Text(localization.t("zehAni.trigger.prompt"))
                .font(.system(size: 18, weight: .medium))
                .foregroundColor(.white.opacity(0.7))

            Text(targetWordHe)
                .font(.system(size: 48, weight: .heavy))
                .foregroundColor(.white)
                .multilineTextAlignment(.center)

            Text(promptText)
                .font(.system(size: 16))
                .foregroundColor(.white.opacity(0.6))
                .multilineTextAlignment(.center)
        }
        .padding(32)
        .frame(maxWidth: .infinity)
        .background(.white.opacity(0.08))
        .clipShape(RoundedRectangle(cornerRadius: 24))
        .overlay(
            RoundedRectangle(cornerRadius: 24)
                .stroke(.white.opacity(0.15), lineWidth: 1)
        )
    }

    private var recordButton: some View {
        Button {
            if isRecording {
                handleStopRecording()
            } else {
                startRecording()
            }
        } label: {
            ZStack {
                Circle()
                    .fill(isRecording ? Color.red.opacity(0.5) : Color.green.opacity(0.2))
                    .frame(width: 100, height: 100)
                    .overlay(
                        Circle().stroke(
                            isRecording ? Color.red : Color.green.opacity(0.6),
                            lineWidth: 3
                        )
                    )

                Image(systemName: isRecording ? "mic.slash.fill" : "mic.fill")
                    .font(.system(size: 40))
                    .foregroundColor(isRecording ? .red : .green)
            }
        }
    }

    @ViewBuilder
    private var successView: some View {
        VStack(spacing: 20) {
            Image(systemName: "checkmark.circle.fill")
                .font(.system(size: 80))
                .foregroundColor(DesignTokens.Color.success)

            Text(localization.t("zehAni.trigger.success"))
                .font(.system(size: 24, weight: .bold))
                .foregroundColor(.white)

            Button(localization.t("zehAni.trigger.continue")) {
                onSuccess?()
                onDismiss?()
            }
            .buttonStyle(.borderedProminent)
            .tint(DesignTokens.Color.success)
        }
        .onAppear {
            DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
                onSuccess?()
                onDismiss?()
            }
        }
    }

    @ViewBuilder
    private var retryView: some View {
        VStack(spacing: 20) {
            Image(systemName: "xmark.circle.fill")
                .font(.system(size: 60))
                .foregroundColor(DesignTokens.Color.error)

            Text(localization.t("zehAni.trigger.incorrect"))
                .font(.system(size: 20, weight: .semibold))
                .foregroundColor(.white)

            if !correctTransliteration.isEmpty {
                Text("\(localization.t("zehAni.trigger.correct")): \(correctTransliteration)")
                    .font(.system(size: 16))
                    .foregroundColor(.white.opacity(0.7))
            }

            HStack(spacing: 12) {
                Button(localization.t("zehAni.trigger.tryAgain")) {
                    showRetry = false
                }
                .buttonStyle(.bordered)

                Button(localization.t("zehAni.trigger.skip")) {
                    onDismiss?()
                }
                .buttonStyle(.borderedProminent)
            }
        }
    }

    private func startRecording() {
        let tempDir = FileManager.default.temporaryDirectory
        recordingURL = tempDir.appendingPathComponent("trigger_recording.wav")

        let recorderSettings: [String: Any] = [
            AVFormatIDKey: Int(kAudioFormatLinearPCM),
            AVSampleRateKey: 16000.0,
            AVNumberOfChannelsKey: 1,
            AVLinearPCMBitDepthKey: 16,
            AVLinearPCMIsFloatKey: false,
        ]

        do {
            audioRecorder = try AVAudioRecorder(url: recordingURL!, settings: recorderSettings)
            audioRecorder?.record()
            isRecording = true
        } catch {
            logger.error(
                "Audio recorder initialization failed",
                error: error,
                context: ["targetWord": targetWordHe]
            )
            self.error = localization.t("zehAni.trigger.errors.microphoneFailed")
        }
    }

    private func handleStopRecording() {
        audioRecorder?.stop()
        isRecording = false

        guard let url = recordingURL,
              let audioData = try? Data(contentsOf: url) else {
            showRetry = true
            return
        }

        let audioBase64 = audioData.base64EncodedString()
        onAudioCaptured?(audioBase64)
    }

    func handleTriggerResult(correct: Bool, transliteration: String) {
        if correct {
            showSuccess = true
        } else {
            correctTransliteration = transliteration
            showRetry = true
        }
    }
}
