import BayitDesignSystem
import SwiftUI
import UIKit

/// Timestamp-triggered comprehension quiz that appears during playback.
/// Pauses video at configured timestamps and presents contextual questions.
struct ComprehensionQuizOverlayView: View {
    @Environment(RepositoryProvider.self) private var repos
    @State private var viewModel: TriviaViewModel?
    @State private var hasTriggered = false

    let contentId: String
    let profileId: String?
    let triggerTimestamp: TimeInterval
    let currentTime: TimeInterval
    let onDismiss: () -> Void
    let onPausePlayback: () -> Void
    let onResumePlayback: () -> Void

    var body: some View {
        ZStack {
            if shouldShow {
                quizContent
                    .transition(.opacity.combined(with: .scale(scale: 0.95)))
            }
        }
        .animation(.spring(duration: 0.4, bounce: 0.2), value: shouldShow)
        .onChange(of: currentTime) { _, newTime in
            checkTrigger(at: newTime)
        }
    }

    // MARK: - Trigger

    private var shouldShow: Bool {
        hasTriggered && viewModel != nil && viewModel?.isComplete != true
    }

    private func checkTrigger(at time: TimeInterval) {
        let triggerWindow: TimeInterval = 1.0
        guard !hasTriggered,
              abs(time - triggerTimestamp) < triggerWindow else { return }

        hasTriggered = true
        onPausePlayback()

        Task {
            if viewModel == nil {
                viewModel = TriviaViewModel(repository: repos.trivia)
            }
            await viewModel?.loadQuiz(contentId: contentId, profileId: profileId)
        }
    }

    // MARK: - Content

    private var quizContent: some View {
        ZStack {
            Color.black.opacity(0.85)
                .ignoresSafeArea()

            VStack(spacing: DesignTokens.Spacing.xl) {
                comprehensionHeader
                Spacer()
                questionContent
                Spacer()
            }
            .padding(.horizontal, DesignTokens.Spacing.lg)
        }
    }

    private var comprehensionHeader: some View {
        HStack {
            GlassBadge(text: "Comprehension Check", variant: .info)

            Spacer()

            Button {
                let generator = UIImpactFeedbackGenerator(style: .light)
                generator.impactOccurred()
                dismissQuiz()
            } label: {
                Image(systemName: "xmark")
                    .font(.system(size: DesignTokens.FontSize.md, weight: .semibold))
                    .foregroundStyle(DesignTokens.Text.secondary)
                    .frame(width: 44, height: 44)
            }
            .accessibilityLabel("Skip comprehension check")
        }
        .padding(.top, DesignTokens.Spacing.lg)
    }

    @ViewBuilder
    private var questionContent: some View {
        if let vm = viewModel {
            if vm.isLoading && vm.quiz == nil {
                ProgressView()
                    .tint(DesignTokens.Primary.default)
                    .scaleEffect(1.2)
                    .accessibilityLabel("Loading comprehension question")
            } else if vm.isComplete, let result = vm.result {
                QuizResultsView(
                    result: result,
                    totalQuestions: vm.totalQuestions,
                    onDismiss: { dismissQuiz() }
                )
            } else if let question = vm.currentQuestion {
                VStack(spacing: DesignTokens.Spacing.lg) {
                    if let total = vm.quiz?.questions.count, total > 0 {
                        QuizProgressView(
                            currentIndex: vm.currentQuestionIndex,
                            total: total
                        )
                    }

                    QuizQuestionView(
                        question: question,
                        questionNumber: vm.currentQuestionIndex + 1,
                        totalQuestions: vm.totalQuestions,
                        selectedAnswer: vm.selectedAnswer,
                        isAnswered: vm.isAnswered,
                        onSelectAnswer: { index in vm.selectAnswer(index) }
                    )
                    .id(vm.currentQuestionIndex)
                }
            }
        }
    }

    // MARK: - Actions

    private func dismissQuiz() {
        onResumePlayback()
        onDismiss()
    }
}
