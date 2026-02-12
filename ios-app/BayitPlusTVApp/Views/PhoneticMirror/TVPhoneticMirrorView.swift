#if os(tvOS)
import AVKit
import BayitCore
import BayitDesignSystem
import Speech
import SwiftUI

struct TVPhoneticMirrorView: View {
    @Environment(TVRepositoryProvider.self) private var repos
    @Environment(LocalizationManager.self) private var localization
    let avatarId: String
    let profileId: String
    var onClose: (() -> Void)?

    @State private var phrases: [PracticePhrase] = []
    @State private var currentIdx = 0
    @State private var phase: Phase = .loading
    @State private var lastResult: MirrorAttemptResult?
    @State private var speechEngine = TVSpeechRecognitionEngine()
    @State private var error: String?
    private let logger = BayitLogger(category: "TVPhoneticMirror")
    private enum Phase { case loading, idle, listening, processing, feedback }

    private var currentPhrase: PracticePhrase? {
        guard currentIdx < phrases.count else { return nil }
        return phrases[currentIdx]
    }

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()
            switch phase {
            case .loading: loadingBody
            case .idle, .listening: practiceBody
            case .processing: processingBody
            case .feedback: feedbackBody
            }
        }
        .onAppear { setupAndLoad() }
        .onDisappear { speechEngine.cleanup() }
        .onExitCommand { onClose?() }
    }

    private var loadingBody: some View {
        VStack(spacing: TVDesignTokens.Spacing.lg) {
            ProgressView().tint(.white)
            Text(localization.t("phoneticMirror.loading"))
                .font(.system(size: TVDesignTokens.FontSize.base))
                .foregroundColor(.white.opacity(0.6))
        }
    }

    private var practiceBody: some View {
        VStack(spacing: TVDesignTokens.Spacing.xl) {
            if let phrase = currentPhrase {
                Text(phrase.phraseHe)
                    .font(.system(size: TVDesignTokens.FontSize.hero, weight: .bold))
                    .foregroundColor(.white)
                Text(phrase.transliteration)
                    .font(.system(size: TVDesignTokens.FontSize.lg))
                    .foregroundColor(.white.opacity(0.6))
                Text(phrase.translation)
                    .font(.system(size: TVDesignTokens.FontSize.base))
                    .foregroundColor(.white.opacity(0.4))
            }

            Button {
                if speechEngine.isListening {
                    speechEngine.stopListening()
                } else {
                    speechEngine.startListening(localization: localization) { transcript in
                        handleTranscript(transcript)
                    }
                }
            } label: {
                HStack(spacing: 12) {
                    Image(systemName: speechEngine.isListening ? "mic.slash.fill" : "mic.fill")
                        .font(.system(size: 28))
                    Text(speechEngine.isListening
                         ? localization.t("phoneticMirror.stopRecording")
                         : localization.t("phoneticMirror.pressToSpeak"))
                        .font(.system(size: TVDesignTokens.FontSize.base, weight: .semibold))
                }
                .foregroundColor(.white)
                .padding(.horizontal, TVDesignTokens.Spacing.xl)
                .padding(.vertical, TVDesignTokens.Spacing.lg)
                .background(speechEngine.isListening ? Color.red.opacity(0.6) : Color.red.opacity(0.3))
                .clipShape(RoundedRectangle(cornerRadius: 20))
            }
            .buttonStyle(.card)
            .tvFocusStyle()
        }
    }

    private var processingBody: some View {
        VStack(spacing: TVDesignTokens.Spacing.lg) {
            ProgressView().tint(.white)
            Text(localization.t("phoneticMirror.analyzing"))
                .font(.system(size: TVDesignTokens.FontSize.base))
                .foregroundColor(.white.opacity(0.6))
        }
    }

    private var feedbackBody: some View {
        VStack(spacing: TVDesignTokens.Spacing.lg) {
            if let result = lastResult {
                Text("\(Int(result.pronunciationScore * 100))%")
                    .font(.system(size: 72, weight: .heavy))
                    .foregroundColor(.white)

                HStack(spacing: TVDesignTokens.Spacing.xl) {
                    Button(localization.t("phoneticMirror.tryAgain")) {
                        lastResult = nil
                        phase = .idle
                    }
                    .buttonStyle(.card)
                    .tvFocusStyle()

                    Button(localization.t("phoneticMirror.nextPhrase")) {
                        currentIdx = (currentIdx + 1) % max(phrases.count, 1)
                        lastResult = nil
                        phase = .idle
                    }
                    .buttonStyle(.card)
                    .tvFocusStyle()
                }
            }
        }
    }

    private func setupAndLoad() {
        speechEngine.setup()
        Task {
            do {
                let fetched = try await repos.phoneticMirrorRepository.fetchPhrases(
                    profileId: profileId, difficulty: "medium", count: 10
                )
                await MainActor.run {
                    phrases = fetched
                    phase = fetched.isEmpty ? .loading : .idle
                }
            } catch {
                await MainActor.run { self.error = error.localizedDescription }
            }
        }
    }

    private func handleTranscript(_ transcript: String) {
        guard let phrase = currentPhrase else { return }
        phase = .processing

        Task {
            do {
                let result = try await repos.phoneticMirrorRepository.submitAttempt(
                    audio: transcript.data(using: .utf8) ?? Data(),
                    targetPhraseHe: phrase.phraseHe,
                    targetTransliteration: phrase.transliteration,
                    avatarId: avatarId,
                    profileId: profileId
                )
                await MainActor.run {
                    lastResult = result
                    phase = .feedback
                }
            } catch {
                await MainActor.run {
                    self.error = error.localizedDescription
                    phase = .idle
                }
            }
        }
    }
}
#endif
