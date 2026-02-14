#if os(tvOS)
import BayitCore
import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// tvOS comprehension quiz overlay during playback.
/// Focus-based answer selection for educational content.
struct TVComprehensionQuizOverlayView: View {

    @Environment(LocalizationManager.self) private var localization

    let question: String
    let options: [String]
    let correctIndex: Int?
    let onAnswer: (Int) -> Void
    let onDismiss: () -> Void

    @State private var selectedIndex: Int?
    @State private var showResult = false

    private let logger = BayitLogger(category: "TVComprehensionQuiz")

    var body: some View {
        VStack(spacing: TVDesignTokens.Spacing.xl) {
            questionHeader

            optionsList

            if showResult {
                resultFeedback
            }

            HStack(spacing: TVDesignTokens.Spacing.lg) {
                if !showResult {
                    GlassButton("Submit", variant: .primary, size: .large) {
                        submitAnswer()
                    }
                    .tvFocusStyle()
                    .disabled(selectedIndex == nil)
                } else {
                    GlassButton("Continue", variant: .primary, size: .large) {
                        onDismiss()
                    }
                    .tvFocusStyle()
                }

                GlassButton("Skip", variant: .ghost, size: .large) {
                    onDismiss()
                }
                .tvFocusStyle()
            }
        }
        .padding(TVDesignTokens.Spacing.xxxxl)
        .frame(maxWidth: 800)
        .background(DesignTokens.Glass.bgStrong)
        .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.xl))
    }

    private var questionHeader: some View {
        VStack(spacing: TVDesignTokens.Spacing.md) {
            HStack(spacing: TVDesignTokens.Spacing.sm) {
                Image(systemName: "questionmark.circle")
                    .foregroundStyle(DesignTokens.Primary.p300)
                Text(localization.t("comprehension.title"))
                    .font(.system(size: TVDesignTokens.FontSize.base, weight: .semibold))
                    .foregroundStyle(DesignTokens.Primary.p300)
            }

            Text(question)
                .font(.system(size: TVDesignTokens.FontSize.lg, weight: .medium))
                .foregroundStyle(DesignTokens.Text.primary)
                .multilineTextAlignment(.center)
        }
    }

    private var optionsList: some View {
        VStack(spacing: TVDesignTokens.Spacing.md) {
            ForEach(options.indices, id: \.self) { index in
                optionButton(index: index)
            }
        }
    }

    private func optionButton(index: Int) -> some View {
        let isSelected = selectedIndex == index
        let isCorrect = correctIndex == index

        return Button {
            if !showResult {
                selectedIndex = index
            }
        } label: {
            HStack(spacing: TVDesignTokens.Spacing.lg) {
                Circle()
                    .strokeBorder(
                        optionColor(isSelected: isSelected, isCorrect: isCorrect),
                        lineWidth: 3
                    )
                    .background(
                        Circle().fill(
                            isSelected
                                ? optionColor(isSelected: isSelected, isCorrect: isCorrect).opacity(0.2)
                                : .clear
                        )
                    )
                    .frame(width: 32, height: 32)

                Text(options[index])
                    .font(.system(size: TVDesignTokens.FontSize.base))
                    .foregroundStyle(DesignTokens.Text.primary)

                Spacer()
            }
            .padding(TVDesignTokens.Spacing.lg)
            .frame(minHeight: TVDesignTokens.MinSize.focusableHeight)
        }
        .buttonStyle(.card)
        .disabled(showResult)
    }

    private func optionColor(isSelected: Bool, isCorrect: Bool) -> Color {
        if showResult {
            if isCorrect { return DesignTokens.Success.default }
            if isSelected { return DesignTokens.ErrorColor.default }
        }
        return isSelected ? DesignTokens.Primary.p400 : DesignTokens.Text.muted
    }

    @ViewBuilder
    private var resultFeedback: some View {
        if let selected = selectedIndex {
            let isCorrect = selected == correctIndex
            HStack(spacing: TVDesignTokens.Spacing.md) {
                Image(systemName: isCorrect ? "checkmark.circle.fill" : "xmark.circle.fill")
                    .foregroundStyle(isCorrect ? DesignTokens.Success.default : DesignTokens.ErrorColor.default)
                Text(isCorrect ? "Correct!" : "Not quite")
                    .font(.system(size: TVDesignTokens.FontSize.lg, weight: .semibold))
                    .foregroundStyle(DesignTokens.Text.primary)
            }
        }
    }

    private func submitAnswer() {
        guard let selected = selectedIndex else { return }
        showResult = true
        onAnswer(selected)
        logger.info("Quiz answered", context: [
            "selected": "\(selected)",
            "correct": "\(correctIndex ?? -1)"
        ])
    }
}
#endif
