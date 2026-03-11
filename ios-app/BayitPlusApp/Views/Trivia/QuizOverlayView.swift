import BayitDesignSystem
import BayitLocalization
import SwiftUI
import UIKit

/// Full-screen modal overlay for content trivia quizzes with glassmorphic backdrop.
/// Manages quiz flow from loading through questions to results.
struct QuizOverlayView: View {
    @Environment(RepositoryProvider.self) private var repos
    @Environment(LocalizationManager.self) private var localization
    @State private var viewModel: TriviaViewModel?

    let contentId: String
    let profileId: String?
    let onDismiss: () -> Void

    var body: some View {
        ZStack {
            // Glassmorphic backdrop
            Color.black.opacity(0.85)
                .ignoresSafeArea()

            VStack(spacing: 0) {
                header
                Spacer()
                contentBody
                Spacer()
            }
            .padding(.horizontal, DesignTokens.Spacing.lg)
        }
        .task {
            if viewModel == nil {
                viewModel = TriviaViewModel(repository: repos.trivia)
            }
            await viewModel?.loadQuiz(contentId: contentId, profileId: profileId)
        }
    }

    // MARK: - Header

    private var header: some View {
        HStack {
            if let vm = viewModel, !vm.isComplete {
                QuizProgressView(
                    currentIndex: vm.currentQuestionIndex,
                    total: vm.totalQuestions
                )
            }

            Spacer()

            Button {
                let generator = UIImpactFeedbackGenerator(style: .light)
                generator.impactOccurred()
                onDismiss()
            } label: {
                Image(systemName: "xmark")
                    .font(.system(size: DesignTokens.FontSize.md, weight: .semibold))
                    .foregroundStyle(DesignTokens.Text.secondary)
                    .frame(width: 44, height: 44)
            }
            .accessibilityLabel("Close quiz")
        }
        .padding(.top, DesignTokens.Spacing.lg)
    }

    // MARK: - Content

    @ViewBuilder
    private var contentBody: some View {
        if let vm = viewModel {
            if vm.isLoading && vm.quiz == nil {
                loadingState
            } else if let error = vm.error, vm.quiz == nil {
                errorState(error)
            } else if vm.isComplete, let result = vm.result {
                QuizResultsView(
                    result: result,
                    totalQuestions: vm.totalQuestions,
                    onDismiss: onDismiss
                )
            } else if let question = vm.currentQuestion {
                QuizQuestionView(
                    question: question,
                    questionNumber: vm.currentQuestionIndex + 1,
                    totalQuestions: vm.totalQuestions,
                    selectedAnswer: vm.selectedAnswer,
                    isAnswered: vm.isAnswered,
                    onSelectAnswer: { index in vm.selectAnswer(index) }
                )
                .transition(.asymmetric(
                    insertion: .move(edge: .trailing).combined(with: .opacity),
                    removal: .move(edge: .leading).combined(with: .opacity)
                ))
                .id(vm.currentQuestionIndex)
            }
        }
    }

    // MARK: - States

    private var loadingState: some View {
        VStack(spacing: DesignTokens.Spacing.lg) {
            ProgressView()
                .tint(DesignTokens.Primary.default)
                .scaleEffect(1.2)

            Text(localization.t("quiz.loading"))
                .font(.system(size: DesignTokens.FontSize.md))
                .foregroundStyle(DesignTokens.Text.muted)
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel("Loading quiz")
    }

    private func errorState(_ message: String) -> some View {
        VStack(spacing: DesignTokens.Spacing.lg) {
            Image(systemName: "exclamationmark.triangle")
                .font(.system(size: 48))
                .foregroundStyle(DesignTokens.Warning.default)
                .accessibilityHidden(true)

            Text(message)
                .font(.system(size: DesignTokens.FontSize.md))
                .foregroundStyle(DesignTokens.Text.secondary)
                .multilineTextAlignment(.center)

            GlassButton(localization.t("common.retry"), variant: .secondary, size: .medium) {
                Task { await viewModel?.loadQuiz(contentId: contentId, profileId: profileId) }
            }
        }
        .accessibilityElement(children: .combine)
    }
}
