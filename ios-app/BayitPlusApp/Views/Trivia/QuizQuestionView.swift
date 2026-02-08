import BayitDesignSystem
import SwiftUI

/// Displays a single quiz question with its text and a 2-column grid
/// of color-coded answer buttons with correct/incorrect feedback.
struct QuizQuestionView: View {
    let question: QuizQuestion
    let questionNumber: Int
    let totalQuestions: Int
    let selectedAnswer: Int?
    let isAnswered: Bool
    let onSelectAnswer: (Int) -> Void

    private let columns = [
        GridItem(.flexible(), spacing: DesignTokens.Spacing.md),
        GridItem(.flexible(), spacing: DesignTokens.Spacing.md)
    ]

    var body: some View {
        VStack(spacing: DesignTokens.Spacing.xl) {
            questionHeader
            questionText
            answersGrid
        }
    }

    // MARK: - Header

    private var questionHeader: some View {
        HStack {
            if let category = question.category {
                GlassBadge(text: category, variant: .info)
            }
            Spacer()
            if let difficulty = question.difficulty {
                GlassBadge(text: difficulty, variant: difficultyVariant(difficulty))
            }
        }
    }

    // MARK: - Question Text

    private var questionText: some View {
        Text(question.text ?? "")
            .font(.system(size: DesignTokens.FontSize.xl, weight: .semibold))
            .foregroundStyle(DesignTokens.Text.primary)
            .multilineTextAlignment(.center)
            .frame(maxWidth: .infinity)
            .padding(.horizontal, DesignTokens.Spacing.base)
            .accessibilityLabel("Question \(questionNumber) of \(totalQuestions): \(question.text ?? "")")
    }

    // MARK: - Answers Grid

    private var answersGrid: some View {
        LazyVGrid(columns: columns, spacing: DesignTokens.Spacing.md) {
            ForEach(Array(question.options.enumerated()), id: \.offset) { index, option in
                QuizAnswerButton(
                    text: option,
                    index: index,
                    isSelected: selectedAnswer == index,
                    isCorrect: question.correctIndex == index,
                    isAnswered: isAnswered,
                    onTap: { onSelectAnswer(index) }
                )
            }
        }
    }

    // MARK: - Helpers

    private func difficultyVariant(_ difficulty: String) -> GlassBadge.Variant {
        switch difficulty.lowercased() {
        case "easy": return .success
        case "medium": return .warning
        case "hard": return .error
        default: return .info
        }
    }
}
