import BayitCore
import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Main Talk Back overlay presented during content playback.
/// Implements a state machine: question -> listening -> evaluating -> result.
/// Provides Hebrew voice engagement with character-driven prompts.
struct TalkBackOverlayView: View {
    @Environment(LocalizationManager.self) private var localization
    @Bindable var viewModel: TalkBackViewModel
    let sessionId: String
    let contentId: String
    let profileId: String
    let onPromptAudioPlay: ((String) -> Void)?

    @State private var isVisible = false
    @State private var micPulseScale: CGFloat = 1.0

    private let logger = BayitLogger(category: "TalkBackOverlay")

    var body: some View {
        Group {
            if viewModel.state != .idle {
                overlayContent
                    .transition(.asymmetric(
                        insertion: .move(edge: .trailing).combined(with: .opacity),
                        removal: .opacity
                    ))
            }
        }
        .animation(.spring(response: 0.35, dampingFraction: 0.8), value: viewModel.state)
        .onChange(of: viewModel.state) { _, newState in
            if newState == .question, let point = viewModel.currentPoint {
                if let audioUrl = point.promptAudioUrl {
                    onPromptAudioPlay?(audioUrl)
                }
            }
        }
    }

    private var overlayContent: some View {
        VStack(spacing: DesignTokens.Spacing.base) {
            switch viewModel.state {
            case .idle:
                EmptyView()

            case .question:
                questionView

            case .listening:
                listeningView

            case .evaluating:
                evaluatingView

            case .result:
                resultView
            }
        }
        .padding(DesignTokens.Spacing.base)
        .frame(maxWidth: 360)
        .background {
            ZStack {
                Color.black.opacity(0.8)
                VisualEffectBlur()
            }
        }
        .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.lg))
        .overlay(
            RoundedRectangle(cornerRadius: DesignTokens.Radius.lg)
                .stroke(DesignTokens.Glass.border, lineWidth: 1)
        )
        .shadow(color: DesignTokens.Glass.purpleGlow, radius: 8, x: 0, y: 4)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottomTrailing)
        .padding(.trailing, DesignTokens.Spacing.base)
        .padding(.bottom, 120)
    }

    // MARK: - Question State

    @ViewBuilder
    private var questionView: some View {
        if let point = viewModel.currentPoint {
            TalkBackCharacterView(
                characterName: point.characterName,
                questionText: point.questionTextHe,
                isSpeaking: true
            )

            HStack(spacing: DesignTokens.Spacing.md) {
                GlassButton(localization.t("player.talkback.respond"), variant: .primary, size: .small,
                            icon: Image(systemName: "mic.fill"))
                {
                    viewModel.startListening()
                }

                GlassButton(localization.t("common.skip"), variant: .ghost, size: .small) {
                    viewModel.dismiss()
                }
            }
        }
    }

    // MARK: - Listening State

    private var listeningView: some View {
        VStack(spacing: DesignTokens.Spacing.base) {
            ZStack {
                Circle()
                    .fill(DesignTokens.ErrorColor.default.opacity(0.15))
                    .frame(width: 72, height: 72)
                    .scaleEffect(micPulseScale)

                Circle()
                    .strokeBorder(DesignTokens.ErrorColor.default.opacity(0.6), lineWidth: 2)
                    .frame(width: 64, height: 64)

                Image(systemName: "mic.fill")
                    .font(.system(size: DesignTokens.FontSize.xl))
                    .foregroundStyle(DesignTokens.ErrorColor.default)
            }
            .onAppear { startMicPulse() }

            Text(localization.t("talkBack.listening"))
                .font(.system(size: DesignTokens.FontSize.base, weight: .medium))
                .foregroundStyle(DesignTokens.Text.secondary)
        }
        .accessibilityLabel(localization.t("talkBack.listeningForResponse"))
    }

    // MARK: - Evaluating State

    private var evaluatingView: some View {
        VStack(spacing: DesignTokens.Spacing.md) {
            GlassSpinner(size: .medium)

            Text(localization.t("talkBack.evaluating"))
                .font(.system(size: DesignTokens.FontSize.base, weight: .medium))
                .foregroundStyle(DesignTokens.Text.secondary)
        }
        .accessibilityLabel(localization.t("talkBack.evaluatingResponse"))
    }

    // MARK: - Result State

    @ViewBuilder
    private var resultView: some View {
        if let evaluation = viewModel.lastEvaluation {
            TalkBackResultView(
                evaluation: evaluation,
                onTryAgain: { viewModel.retryCurrentPoint() },
                onContinue: { viewModel.dismiss() }
            )
        }
    }

    // MARK: - Animations

    private func startMicPulse() {
        withAnimation(.easeInOut(duration: 0.5).repeatForever(autoreverses: true)) {
            micPulseScale = 1.2
        }
    }
}
