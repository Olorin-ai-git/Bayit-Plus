import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// tvOS Trivia screen with focus-based quiz answer selection.
/// Reuses TriviaViewModel from shared ViewModels.
struct TVTriviaView: View {
    @Environment(TVRepositoryProvider.self) private var repos
    @Environment(LocalizationManager.self) private var localization
    @State private var viewModel: TriviaViewModel?
    @State private var contentId: String = ""

    var body: some View {
        NavigationStack {
            ScrollView(.vertical, showsIndicators: false) {
                if let vm = viewModel {
                    if vm.isLoading && vm.quiz == nil {
                        loadingState
                    } else if let error = vm.error, vm.quiz == nil {
                        tvErrorState(error) {
                            Task { await vm.loadQuiz(contentId: contentId, profileId: nil) }
                        }
                    } else if vm.isComplete, let result = vm.result {
                        resultView(result, vm: vm)
                    } else if let question = vm.currentQuestion {
                        questionView(question, vm: vm)
                    } else {
                        startView
                    }
                }
            }
            .background(DesignTokens.Background.primary)
            .task {
                if viewModel == nil {
                    viewModel = TriviaViewModel(repository: repos.trivia)
                }
            }
        }
    }

    private var startView: some View {
        VStack(spacing: TVDesignTokens.Spacing.xl) {
            Image(systemName: "questionmark.circle")
                .font(.system(size: TVDesignTokens.FontSize.hero))
                .foregroundStyle(DesignTokens.Primary.default)

            Text(localization.t("trivia.title"))
                .font(.system(size: TVDesignTokens.FontSize.xxxl, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)

            Text(localization.t("trivia.selectContent"))
                .font(.system(size: TVDesignTokens.FontSize.lg))
                .foregroundStyle(DesignTokens.Text.secondary)
                .multilineTextAlignment(.center)
                .frame(maxWidth: 600)
        }
        .frame(maxWidth: .infinity)
        .padding(.top, TVDesignTokens.Spacing.xxxxl)
    }

    private func questionView(_ question: QuizQuestion, vm: TriviaViewModel) -> some View {
        VStack(spacing: TVDesignTokens.Spacing.xxl) {
            progressBar(vm)

            Text(question.text ?? "")
                .font(.system(size: TVDesignTokens.FontSize.xxl, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)
                .multilineTextAlignment(.center)
                .frame(maxWidth: 800)
                .padding(.top, TVDesignTokens.Spacing.xxl)

            VStack(spacing: TVDesignTokens.Spacing.lg) {
                ForEach(Array(question.options.enumerated()), id: \.offset) { index, option in
                    answerButton(
                        option: option,
                        index: index,
                        isSelected: vm.selectedAnswer == index,
                        isCorrect: index == question.correctIndex,
                        isAnswered: vm.isAnswered,
                        action: { vm.selectAnswer(index) }
                    )
                }
            }
            .frame(maxWidth: 700)
        }
        .padding(TVDesignTokens.Spacing.xxl)
    }

    private func progressBar(_: TriviaViewModel) -> some View {
        HStack(spacing: TVDesignTokens.Spacing.md) {
            Text(localization.t("trivia.questionCount"))
                .font(.system(size: TVDesignTokens.FontSize.lg, weight: .semibold))
                .foregroundStyle(DesignTokens.Text.secondary)

            Spacer()

            Text(localization.t("trivia.score"))
                .font(.system(size: TVDesignTokens.FontSize.lg, weight: .bold))
                .foregroundStyle(DesignTokens.Primary.default)
        }
        .padding(.horizontal, TVDesignTokens.Spacing.xl)
    }

    private func answerButton(
        option: String,
        index _: Int,
        isSelected: Bool,
        isCorrect: Bool,
        isAnswered: Bool,
        action: @escaping () -> Void
    ) -> some View {
        Button(action: action) {
            HStack {
                Text(option)
                    .font(.system(size: TVDesignTokens.FontSize.lg))
                    .foregroundStyle(DesignTokens.Text.primary)
                Spacer()
                if isAnswered {
                    if isCorrect {
                        Image(systemName: "checkmark.circle.fill")
                            .foregroundStyle(DesignTokens.Colors.Semantic.success)
                    } else if isSelected {
                        Image(systemName: "xmark.circle.fill")
                            .foregroundStyle(DesignTokens.Colors.Semantic.error)
                    }
                }
            }
            .padding(TVDesignTokens.Spacing.lg)
            .background(answerBackground(isSelected: isSelected, isCorrect: isCorrect, isAnswered: isAnswered))
            .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.default))
        }
        .tvCardStyle()
        .disabled(isAnswered)
    }

    private func answerBackground(isSelected: Bool, isCorrect: Bool, isAnswered: Bool) -> Color {
        if isAnswered && isCorrect {
            return DesignTokens.Colors.Semantic.success.opacity(0.2)
        }
        if isAnswered && isSelected {
            return DesignTokens.Colors.Semantic.error.opacity(0.2)
        }
        return DesignTokens.Glass.bg
    }

    private func resultView(_ result: QuizResult, vm _: TriviaViewModel) -> some View {
        VStack(spacing: TVDesignTokens.Spacing.xxl) {
            Image(systemName: "trophy.fill")
                .font(.system(size: TVDesignTokens.FontSize.hero))
                .foregroundStyle(DesignTokens.Warning.default)

            Text(localization.t("quiz.complete"))
                .font(.system(size: TVDesignTokens.FontSize.xxxl, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)

            Text("\(result.score ?? 0) / \(result.total ?? 0)")
                .font(.system(size: 60, weight: .bold))
                .foregroundStyle(DesignTokens.Primary.default)

            if let total = result.total, total > 0, let score = result.score {
                let pct = Int(Double(score) / Double(total) * 100)
                Text(localization.t("trivia.percentCorrect", ["percent": "\(pct)"]))
                    .font(.system(size: TVDesignTokens.FontSize.xl))
                    .foregroundStyle(DesignTokens.Text.secondary)
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.top, TVDesignTokens.Spacing.xxxxl)
    }

    private var loadingState: some View {
        VStack(spacing: TVDesignTokens.Spacing.xl) {
            ProgressView()
                .tint(DesignTokens.Primary.default)
                .scaleEffect(1.5)
            Text(localization.t("trivia.loading"))
                .font(.system(size: TVDesignTokens.FontSize.lg))
                .foregroundStyle(DesignTokens.Text.muted)
        }
        .frame(maxWidth: .infinity, minHeight: 400)
    }
}
