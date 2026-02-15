#if os(tvOS)
import BayitCore
import BayitDesignSystem
import BayitLocalization
import SwiftUI

struct TVCompanionQuizTab: View {
    @Environment(LocalizationManager.self) private var localization

    let viewModel: AICompanionViewModel
    let contentId: String

    @FocusState private var focusedAnswer: String?
    @FocusState private var submitButtonFocused: Bool

    var body: some View {
        ScrollView(.vertical, showsIndicators: true) {
            VStack(spacing: TVDesignTokens.Spacing.xl) {
                if viewModel.questions.isEmpty {
                    emptyState
                } else {
                    questionsSection
                    actionButtons
                }
            }
            .padding(.horizontal, TVDesignTokens.Spacing.xxl)
            .padding(.vertical, TVDesignTokens.Spacing.xl)
        }
        .task {
            if viewModel.questions.isEmpty {
                await viewModel.loadQuiz(contentId: contentId)
            }
        }
    }

    private var questionsSection: some View {
        ForEach(Array(viewModel.questions.enumerated()), id: \.element.id) { index, question in
            questionCard(question, number: index + 1)
        }
    }

    private func questionCard(_ question: QuizQuestion, number: Int) -> some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.lg) {
            Text("\(localization.t("trivia.question")) \(number)")
                .font(.system(size: TVDesignTokens.FontSize.md, weight: .medium))
                .foregroundStyle(DesignTokens.Primary.p400)

            Text(question.question ?? question.text ?? "")
                .font(.system(size: TVDesignTokens.FontSize.lg, weight: .semibold))
                .foregroundStyle(DesignTokens.Text.primary)
                .lineLimit(3)

            answerGrid(for: question)

            if viewModel.showResults, let explanation = question.explanation {
                explanationSection(explanation)
            }
        }
        .padding(TVDesignTokens.Spacing.xl)
        .background(DesignTokens.Glass.bgLight)
        .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg))
    }

    private func answerGrid(for question: QuizQuestion) -> some View {
        LazyVGrid(
            columns: [
                GridItem(.flexible(), spacing: TVDesignTokens.Spacing.md),
                GridItem(.flexible(), spacing: TVDesignTokens.Spacing.md)
            ],
            spacing: TVDesignTokens.Spacing.md
        ) {
            ForEach(question.options.indices, id: \.self) { index in
                answerButton(question: question, index: index)
            }
        }
    }

    private func answerButton(question: QuizQuestion, index: Int) -> some View {
        let isSelected = viewModel.selectedAnswers[question.id] == index
        let isCorrect = question.correctIndex == index
        let borderColor = answerColor(isSelected: isSelected, isCorrect: isCorrect)

        return Button {
            if !viewModel.showResults {
                viewModel.selectAnswer(questionId: question.id, answerIndex: index)
            }
        } label: {
            HStack(spacing: TVDesignTokens.Spacing.md) {
                Circle()
                    .strokeBorder(borderColor, lineWidth: 3)
                    .background(Circle().fill(isSelected ? borderColor.opacity(0.3) : .clear))
                    .frame(width: 28, height: 28)

                Text(question.options[index])
                    .font(.system(size: TVDesignTokens.FontSize.md))
                    .foregroundStyle(DesignTokens.Text.primary)
                    .lineLimit(2)
                    .multilineTextAlignment(.leading)

                Spacer()
            }
            .padding(TVDesignTokens.Spacing.lg)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(viewModel.showResults && isCorrect ? DesignTokens.Success.default.opacity(0.1) : DesignTokens.Glass.bgMedium)
            .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md))
        }
        .buttonStyle(.card)
        .tvFocusStyle()
        .focused($focusedAnswer, equals: "\(question.id)-\(index)")
        .disabled(viewModel.showResults)
    }

    private func answerColor(isSelected: Bool, isCorrect: Bool) -> Color {
        if viewModel.showResults {
            return isCorrect ? DesignTokens.Success.default : (isSelected ? DesignTokens.ErrorColor.default : DesignTokens.Text.muted)
        }
        return isSelected ? DesignTokens.Primary.p400 : DesignTokens.Text.muted
    }

    private func explanationSection(_ text: String) -> some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.sm) {
            HStack(spacing: TVDesignTokens.Spacing.sm) {
                Image(systemName: "lightbulb.fill")
                    .foregroundStyle(DesignTokens.Primary.p300)

                Text(localization.t("trivia.explanation"))
                    .font(.system(size: TVDesignTokens.FontSize.md, weight: .semibold))
                    .foregroundStyle(DesignTokens.Primary.p400)
            }

            Text(text)
                .font(.system(size: TVDesignTokens.FontSize.md))
                .foregroundStyle(DesignTokens.Text.secondary)
                .lineSpacing(4)
        }
        .padding(TVDesignTokens.Spacing.lg)
        .background(DesignTokens.Glass.purpleLight)
        .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md))
    }

    private var actionButtons: some View {
        HStack(spacing: TVDesignTokens.Spacing.lg) {
            if !viewModel.showResults {
                GlassButton(
                    localization.t("trivia.submit"),
                    variant: .primary,
                    size: .large
                ) {
                    viewModel.submitQuiz()
                }
                .disabled(viewModel.selectedAnswers.count < viewModel.questions.count)
                .frame(maxWidth: 500)
                .focused($submitButtonFocused)
            } else {
                GlassButton(
                    localization.t("trivia.tryAgain"),
                    variant: .secondary,
                    size: .large
                ) {
                    viewModel.resetQuiz()
                }
                .frame(maxWidth: 500)
                .focused($submitButtonFocused)
            }
        }
        .frame(maxWidth: .infinity)
    }

    private var emptyState: some View {
        VStack(spacing: TVDesignTokens.Spacing.xl) {
            Spacer()

            Image(systemName: "questionmark.circle")
                .font(.system(size: TVDesignTokens.FontSize.hero))
                .foregroundStyle(DesignTokens.Text.muted)

            Text(localization.t("aiCompanion.quiz.empty"))
                .font(.system(size: TVDesignTokens.FontSize.lg))
                .foregroundStyle(DesignTokens.Text.muted)

            Spacer()
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}
#endif
