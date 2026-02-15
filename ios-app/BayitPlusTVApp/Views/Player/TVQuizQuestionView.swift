#if os(tvOS)
import SwiftUI
import BayitDesignSystem
import BayitLocalization

struct TVQuizQuestionView: View {
    let viewModel: TriviaViewModel

    @Environment(LocalizationManager.self) private var localization
    @FocusState private var focusedAnswerIndex: Int?

    var body: some View {
        VStack(spacing: TVDesignTokens.Spacing.lg) {
            TVQuizProgressView(
                current: viewModel.currentQuestionIndex + 1,
                total: viewModel.totalQuestions,
                score: viewModel.score
            )

            if let question = viewModel.currentQuestion {
                questionCard(question)
                answersGrid(question)
            }
        }
        .onChange(of: viewModel.currentQuestionIndex) { _, _ in
            focusedAnswerIndex = nil
        }
    }

    private func questionCard(_ question: QuizQuestion) -> some View {
        VStack(spacing: TVDesignTokens.Spacing.md) {
            Text(question.question ?? "")
                .font(.system(size: TVDesignTokens.FontSize.xl, weight: .semibold))
                .foregroundStyle(DesignTokens.Text.primary)
                .multilineTextAlignment(.center)
                .lineLimit(nil)
                .fixedSize(horizontal: false, vertical: true)
        }
        .padding(TVDesignTokens.Spacing.lg)
        .frame(maxWidth: .infinity)
        .background {
            RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg)
                .fill(DesignTokens.Glass.bg)
                .overlay {
                    RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg)
                        .stroke(DesignTokens.Glass.border, lineWidth: 1)
                }
        }
    }

    private func answersGrid(_ question: QuizQuestion) -> some View {
        LazyVGrid(
            columns: [
                GridItem(.flexible(), spacing: TVDesignTokens.Spacing.md),
                GridItem(.flexible(), spacing: TVDesignTokens.Spacing.md)
            ],
            spacing: TVDesignTokens.Spacing.md
        ) {
            ForEach(Array(question.options.enumerated()), id: \.offset) { index, answer in
                TVQuizAnswerButton(
                    text: answer,
                    index: index,
                    isSelected: viewModel.selectedAnswer == index,
                    isCorrect: index == question.correctIndex,
                    isRevealed: viewModel.isAnswered,
                    onTap: {
                        viewModel.selectAnswer(index)
                    }
                )
                .focused($focusedAnswerIndex, equals: index)
            }
        }
        .padding(.top, TVDesignTokens.Spacing.md)
    }
}
#endif
