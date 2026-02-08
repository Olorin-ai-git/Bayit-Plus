import BayitDesignSystem
import SwiftUI
import UIKit

/// Color-coded answer button for quiz questions with correct/incorrect feedback.
///
/// Colors cycle through coral, teal, yellow, and mint for visual distinction.
/// After selection, shows green for correct and red for incorrect answers.
struct QuizAnswerButton: View {
    let text: String
    let index: Int
    let isSelected: Bool
    let isCorrect: Bool
    let isAnswered: Bool
    let onTap: () -> Void

    /// Answer button accent colors (coral, teal, yellow, mint)
    private static let accentColors: [Color] = [
        Color(hex: 0xFF6B6B),
        Color(hex: 0x4ECDC4),
        Color(hex: 0xFFE66D),
        Color(hex: 0x95E1D3)
    ]

    var body: some View {
        Button(action: {
            guard !isAnswered else { return }
            let generator = UIImpactFeedbackGenerator(style: .medium)
            generator.impactOccurred()
            onTap()
        }) {
            HStack(spacing: DesignTokens.Spacing.md) {
                answerLabel

                Text(text)
                    .font(.system(size: DesignTokens.FontSize.base, weight: .medium))
                    .foregroundStyle(DesignTokens.Text.primary)
                    .lineLimit(3)
                    .multilineTextAlignment(.leading)

                Spacer()

                if isAnswered {
                    feedbackIcon
                }
            }
            .padding(.vertical, DesignTokens.Spacing.md)
            .padding(.horizontal, DesignTokens.Spacing.base)
            .background(buttonBackground)
            .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
            .overlay(
                RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
                    .stroke(borderColor, lineWidth: isSelected ? 2 : 1)
            )
        }
        .disabled(isAnswered)
        .buttonStyle(AnswerButtonStyle())
        .accessibilityLabel("Answer \(answerLetter): \(text)")
        .accessibilityValue(accessibilityFeedback)
        .accessibilityAddTraits(isSelected ? .isSelected : [])
    }

    // MARK: - Components

    private var answerLabel: some View {
        Text(answerLetter)
            .font(.system(size: DesignTokens.FontSize.sm, weight: .bold))
            .foregroundStyle(DesignTokens.Text.primary)
            .frame(width: 28, height: 28)
            .background(accentColor.opacity(0.8))
            .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.sm))
    }

    @ViewBuilder
    private var feedbackIcon: some View {
        if isSelected && isCorrect {
            Image(systemName: "checkmark.circle.fill")
                .foregroundStyle(DesignTokens.Success.default)
                .font(.system(size: DesignTokens.FontSize.xl))
        } else if isSelected && !isCorrect {
            Image(systemName: "xmark.circle.fill")
                .foregroundStyle(DesignTokens.ErrorColor.default)
                .font(.system(size: DesignTokens.FontSize.xl))
        } else if !isSelected && isCorrect {
            Image(systemName: "checkmark.circle.fill")
                .foregroundStyle(DesignTokens.Success.default.opacity(0.6))
                .font(.system(size: DesignTokens.FontSize.xl))
        }
    }

    // MARK: - Styling

    private var accentColor: Color {
        Self.accentColors[index % Self.accentColors.count]
    }

    @ViewBuilder
    private var buttonBackground: some View {
        if isAnswered && isSelected && isCorrect {
            DesignTokens.Success.default.opacity(0.15)
        } else if isAnswered && isSelected && !isCorrect {
            DesignTokens.ErrorColor.default.opacity(0.15)
        } else if isAnswered && !isSelected && isCorrect {
            DesignTokens.Success.default.opacity(0.08)
        } else {
            DesignTokens.Glass.bgLight
        }
    }

    private var borderColor: Color {
        if isAnswered && isSelected && isCorrect {
            return DesignTokens.Success.default.opacity(0.5)
        } else if isAnswered && isSelected && !isCorrect {
            return DesignTokens.ErrorColor.default.opacity(0.5)
        } else if isAnswered && !isSelected && isCorrect {
            return DesignTokens.Success.default.opacity(0.3)
        } else {
            return DesignTokens.Glass.border
        }
    }

    private var answerLetter: String {
        let letters = ["A", "B", "C", "D", "E", "F"]
        return index < letters.count ? letters[index] : "\(index + 1)"
    }

    private var accessibilityFeedback: String {
        guard isAnswered else { return "" }
        if isSelected && isCorrect { return "Correct" }
        if isSelected && !isCorrect { return "Incorrect" }
        if !isSelected && isCorrect { return "This was the correct answer" }
        return ""
    }
}

private struct AnswerButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? 0.97 : 1.0)
            .animation(.easeInOut(duration: 0.15), value: configuration.isPressed)
    }
}
