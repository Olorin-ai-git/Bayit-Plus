import AVFoundation
import BayitDesignSystem
import BayitLocalization
import SwiftUI

struct V2VPracticeView: View {
    @Environment(RepositoryProvider.self) private var repos
    @Environment(LocalizationManager.self) private var localization

    let avatarId: String
    let profileId: String
    var onClose: (() -> Void)?

    @State private var viewModel = V2VPracticeViewModel()

    var body: some View {
        ZStack {
            DesignTokens.Background.primary.ignoresSafeArea()

            VStack(spacing: 24) {
                if viewModel.practiceState == .idle || viewModel.practiceState == .recording {
                    targetPhraseCard
                    recordButton
                } else if viewModel.practiceState == .transforming {
                    ProgressView()
                        .tint(.white)
                    Text(localization.t("zehAni.v2v.transforming"))
                        .foregroundColor(.white.opacity(0.6))
                        .font(.system(size: 16))
                } else if viewModel.practiceState == .result {
                    resultView
                }

                if let error = viewModel.error {
                    Text(error)
                        .foregroundColor(DesignTokens.Colors.Semantic.error)
                        .font(.system(size: 14))
                }
            }
            .padding(24)
        }
        .onAppear {
            viewModel.setupAudio()
            loadPhraseSet()
            connectWebSocket()
        }
        .onDisappear {
            viewModel.cleanup()
        }
    }

    @ViewBuilder
    private var targetPhraseCard: some View {
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
                    .fill(viewModel.isRecording ? DesignTokens.Primary.default.opacity(0.5) : DesignTokens.Primary.default.opacity(0.2))
                    .frame(width: 80, height: 80)
                    .overlay(
                        Circle().stroke(
                            viewModel.isRecording ? DesignTokens.Primary.default : DesignTokens.Primary.default.opacity(0.6),
                            lineWidth: 2
                        )
                    )

                Image(systemName: viewModel.isRecording ? "mic.slash.fill" : "mic.fill")
                    .font(.system(size: 32))
                    .foregroundColor(DesignTokens.Primary.default)
            }
        }
    }

    @ViewBuilder
    private var resultView: some View {
        VStack(spacing: 20) {
            V2VResultView(
                scoreBefore: viewModel.scoreBefore,
                scoreAfter: viewModel.scoreAfter,
                scoreDelta: viewModel.scoreDelta
            )

            if viewModel.latencyMs > 0 {
                Text("\(localization.t("zehAni.v2v.latency")): \(viewModel.latencyMs)ms")
                    .font(.system(size: 12))
                    .foregroundColor(.white.opacity(0.5))
            }

            HStack(spacing: 12) {
                Button(localization.t("zehAni.v2v.retry")) {
                    viewModel.retry()
                }
                .buttonStyle(.bordered)

                Button(localization.t("zehAni.v2v.nextPhrase")) {
                    viewModel.nextPhrase()
                }
                .buttonStyle(.borderedProminent)
            }
        }
    }

    private func loadPhraseSet() {
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

    private func connectWebSocket() {
        Task {
            guard let token = try? await repos.authTokenProvider.currentToken() else {
                return
            }
            await viewModel.connect(
                avatarId: avatarId,
                manager: repos.webSocketManager,
                authToken: token
            )
        }
    }

    private func handleStopRecording() {
        guard let audioData = viewModel.stopRecording() else { return }
        Task {
            await viewModel.submitForTransform(
                audioData: audioData,
                avatarId: avatarId
            )
        }
    }
}

