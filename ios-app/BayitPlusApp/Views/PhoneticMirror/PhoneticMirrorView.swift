import AVFoundation
import BayitDesignSystem
import BayitLocalization
import SwiftUI

struct PhoneticMirrorView: View {
    @Environment(RepositoryProvider.self) private var repos
    @Environment(LocalizationManager.self) private var localization

    let avatarId: String
    let profileId: String
    var onClose: (() -> Void)?

    @State private var viewModel = PhoneticMirrorViewModel()

    var body: some View {
        ZStack {
            DesignTokens.Background.primary.ignoresSafeArea()

            VStack(spacing: 24) {
                if viewModel.mirrorState == .idle || viewModel.mirrorState == .recording {
                    phraseCard
                    recordButton
                } else if viewModel.mirrorState == .processing {
                    ProgressView()
                        .tint(.white)
                    Text(localization.t("phoneticMirror.analyzing"))
                        .foregroundColor(.white.opacity(0.6))
                } else if viewModel.mirrorState == .feedback, let result = viewModel.lastResult {
                    feedbackView(result: result)
                }

                if let error = viewModel.error {
                    Text(error)
                        .foregroundColor(DesignTokens.ErrorColor.default)
                        .font(.system(size: 14))
                }
            }
            .padding(24)
        }
        .onAppear {
            viewModel.setupSpeech()
            loadPhrases()
        }
        .onDisappear {
            viewModel.cleanup()
        }
    }

    @ViewBuilder
    private var phraseCard: some View {
        if let phrase = viewModel.currentPhrase {
            VStack(spacing: 8) {
                Text(phrase.phraseHe)
                    .font(.system(size: 32, weight: .bold))
                    .foregroundColor(.white)
                    .multilineTextAlignment(.center)

                Text(phrase.transliteration)
                    .font(.system(size: 18))
                    .foregroundColor(.white.opacity(0.6))

                Text(phrase.translation)
                    .font(.system(size: 14))
                    .foregroundColor(.white.opacity(0.4))
            }
            .padding(28)
            .frame(maxWidth: .infinity)
            .background(.white.opacity(0.05))
            .clipShape(RoundedRectangle(cornerRadius: 20))
            .overlay(
                RoundedRectangle(cornerRadius: 20)
                    .stroke(.white.opacity(0.1), lineWidth: 1)
            )
        }
    }

    private var recordButton: some View {
        Button {
            if viewModel.isRecording {
                handleStopRecording()
            } else {
                viewModel.startRecording()
            }
        } label: {
            ZStack {
                Circle()
                    .fill(viewModel.isRecording ? Color.red.opacity(0.5) : Color.red.opacity(0.2))
                    .frame(width: 80, height: 80)
                    .overlay(
                        Circle().stroke(
                            viewModel.isRecording ? Color.red : Color.red.opacity(0.6),
                            lineWidth: 2
                        )
                    )

                Image(systemName: viewModel.isRecording ? "mic.slash.fill" : "mic.fill")
                    .font(.system(size: 32))
                    .foregroundColor(.red)
            }
        }
    }

    @ViewBuilder
    private func feedbackView(result: MirrorAttemptResult) -> some View {
        VStack(spacing: 16) {
            Text("\(Int(result.pronunciationScore * 100))%")
                .font(.system(size: 48, weight: .heavy))
                .foregroundColor(.white)

            Text(localization.t("phoneticMirror.quality.\(result.quality)"))
                .font(.system(size: 14, weight: .semibold))
                .foregroundColor(.white)
                .padding(.horizontal, 16)
                .padding(.vertical, 6)
                .background(qualityColor(result.quality))
                .clipShape(RoundedRectangle(cornerRadius: 12))

            PronunciationFeedbackView(feedback: result.phonemeFeedback)

            if result.correctedAudioUrl != nil {
                Button(localization.t("phoneticMirror.listenCorrect")) {
                    playCorrectedAudio(result)
                }
                .buttonStyle(.bordered)
                .tint(.blue)
            }

            HStack(spacing: 12) {
                Button(localization.t("phoneticMirror.tryAgain")) {
                    viewModel.retry()
                }
                .buttonStyle(.bordered)

                Button(localization.t("phoneticMirror.nextPhrase")) {
                    viewModel.nextPhrase()
                }
                .buttonStyle(.borderedProminent)
            }
        }
    }

    private func qualityColor(_ quality: String) -> Color {
        switch quality {
        case "excellent": return DesignTokens.Success.default
        case "good": return DesignTokens.Success.default.opacity(0.8)
        case "fair": return DesignTokens.Warning.default
        case "needs_practice": return .orange
        default: return DesignTokens.ErrorColor.default
        }
    }

    private func loadPhrases() {
        Task {
            do {
                let phrases = try await repos.phoneticMirrorRepository.fetchPhrases(
                    profileId: profileId, difficulty: "medium", count: 10
                )
                await MainActor.run {
                    viewModel.phrases = phrases
                    viewModel.currentPhrase = phrases.first
                }
            } catch {
                await MainActor.run {
                    viewModel.error = error.localizedDescription
                }
            }
        }
    }

    private func handleStopRecording() {
        guard let audioData = viewModel.stopRecording() else { return }
        Task {
            await viewModel.submitAttempt(
                audioData: audioData,
                repository: repos.phoneticMirrorRepository,
                avatarId: avatarId,
                profileId: profileId
            )
        }
    }

    private func playCorrectedAudio(_ result: MirrorAttemptResult) {
        guard let urlString = result.correctedAudioUrl,
              let url = URL(string: urlString) else { return }
        let player = AVPlayer(url: url)
        player.play()
    }
}
