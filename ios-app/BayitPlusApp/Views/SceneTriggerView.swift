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
                    SceneTriggerErrorView(message: error) {
                        onDismiss?()
                    }
                } else if !showSuccess && !showRetry {
                    SceneTriggerPromptCard(
                        targetWordHe: targetWordHe,
                        promptText: promptText
                    )
                    SceneTriggerRecordButton(isRecording: isRecording) {
                        if isRecording {
                            handleStopRecording()
                        } else {
                            startRecording()
                        }
                    }
                } else if showSuccess {
                    SceneTriggerSuccessView(
                        onContinue: {
                            onSuccess?()
                            onDismiss?()
                        },
                        autoAdvanceDelay: 2
                    )
                } else if showRetry {
                    SceneTriggerRetryView(
                        correctTransliteration: correctTransliteration,
                        onTryAgain: {
                            showRetry = false
                        },
                        onSkip: {
                            onDismiss?()
                        }
                    )
                }
            }
            .padding(32)
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
