#if os(iOS)
    import BayitDesignSystem
    import BayitLocalization
    import SwiftUI

    /// Quiz tab with interactive questions about current content.
    struct CompanionQuizTab: View {
        @Environment(LocalizationManager.self) private var localization
        let viewModel: AICompanionViewModel

        var body: some View {
            ScrollView(.vertical, showsIndicators: true) {
                VStack(spacing: DesignTokens.Spacing.md) {
                    if viewModel.questions.isEmpty {
                        emptyState
                    } else {
                        ForEach(viewModel.questions) { question in
                            questionCard(question)
                        }

                        if !viewModel.showResults {
                            GlassButton(localization.t("quiz.checkAnswers"), variant: .primary) {
                                viewModel.submitQuiz()
                            }
                            .disabled(viewModel.selectedAnswers.count < viewModel.questions.count)
                        } else {
                            GlassButton(localization.t("common.tryAgain"), variant: .secondary) {
                                viewModel.resetQuiz()
                            }
                        }
                    }
                }
                .padding(.horizontal, DesignTokens.Spacing.base)
                .padding(.vertical, DesignTokens.Spacing.md)
            }
        }

        private func questionCard(_ question: QuizQuestion) -> some View {
            VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
                Text(question.question ?? question.text ?? "")
                    .font(.system(size: DesignTokens.FontSize.sm, weight: .medium))
                    .foregroundStyle(DesignTokens.Text.primary)

                ForEach(question.options.indices, id: \.self) { index in
                    optionRow(question: question, index: index)
                }

                if viewModel.showResults, let explanation = question.explanation {
                    Text(explanation)
                        .font(.system(size: DesignTokens.FontSize.xs))
                        .foregroundStyle(DesignTokens.Text.secondary)
                        .padding(.top, DesignTokens.Spacing.xs)
                }
            }
            .padding(DesignTokens.Spacing.md)
            .background(DesignTokens.Glass.bgLight)
            .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
        }

        private func optionRow(question: QuizQuestion, index: Int) -> some View {
            let isSelected = viewModel.selectedAnswers[question.id] == index
            let isCorrect = question.correctIndex == index

            return Button {
                if !viewModel.showResults {
                    viewModel.selectAnswer(questionId: question.id, answerIndex: index)
                }
            } label: {
                HStack(spacing: DesignTokens.Spacing.sm) {
                    Circle()
                        .strokeBorder(optionColor(isSelected: isSelected, isCorrect: isCorrect), lineWidth: 2)
                        .background(Circle().fill(isSelected ? optionColor(isSelected: isSelected, isCorrect: isCorrect).opacity(0.2) : .clear))
                        .frame(width: 20, height: 20)

                    Text(question.options[index])
                        .font(.system(size: DesignTokens.FontSize.sm))
                        .foregroundStyle(DesignTokens.Text.primary)

                    Spacer()
                }
                .padding(.vertical, DesignTokens.Spacing.xs)
            }
            .buttonStyle(.plain)
            .disabled(viewModel.showResults)
        }

        private func optionColor(isSelected: Bool, isCorrect: Bool) -> Color {
            if viewModel.showResults {
                if isCorrect { return DesignTokens.Success.default }
                if isSelected { return DesignTokens.ErrorColor.default }
            }
            return isSelected ? DesignTokens.Primary.p400 : DesignTokens.Text.muted
        }

        private var emptyState: some View {
            VStack(spacing: DesignTokens.Spacing.md) {
                Spacer()
                Image(systemName: "questionmark.circle")
                    .font(.system(size: 32))
                    .foregroundStyle(DesignTokens.Text.muted)
                Text(localization.t("aiCompanion.quiz.empty"))
                    .font(.system(size: DesignTokens.FontSize.sm))
                    .foregroundStyle(DesignTokens.Text.muted)
                Spacer()
            }
            .frame(maxWidth: .infinity)
        }
    }
#endif
