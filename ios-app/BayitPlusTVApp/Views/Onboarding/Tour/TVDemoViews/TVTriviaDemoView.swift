import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// tvOS trivia demo: timed trivia card overlay on video.
/// Use Siri Remote click to select an answer.
struct TVTriviaDemoView: View {
    @Environment(LocalizationManager.self) var localization
    @State private var showTrivia = false
    @State private var selectedAnswer: Int?

    private let answerKeys = [
        "onboarding.tour.trivia.answer1",
        "onboarding.tour.trivia.answer2",
        "onboarding.tour.trivia.answer3",
        "onboarding.tour.trivia.answer4",
    ]
    private let correctIndex = 1

    var body: some View {
        ZStack {
            InlineVideoPlayer(assetName: "demo_live_trivia")
                .clipShape(
                    RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg)
                )

            if showTrivia {
                triviaOverlay
                    .transition(.move(edge: .bottom).combined(with: .opacity))
            }
        }
        .padding(.horizontal, TVDesignTokens.Spacing.xxxxl)
        .padding(.vertical, TVDesignTokens.Spacing.xl)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .onAppear { scheduleTrivia() }
    }

    // MARK: - Trivia Overlay

    private var triviaOverlay: some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.lg) {
            Text(localization.t("onboarding.tour.trivia.sampleQuestion"))
                .font(.system(size: TVDesignTokens.FontSize.xl, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)

            VStack(spacing: TVDesignTokens.Spacing.focusGap) {
                ForEach(
                    Array(answerKeys.enumerated()), id: \.offset
                ) { index, key in
                    answerButton(
                        answer: localization.t(key), index: index
                    )
                }
            }

            if let selected = selectedAnswer {
                resultLabel(isCorrect: selected == correctIndex)
            }
        }
        .padding(TVDesignTokens.Spacing.xxl)
        .frame(maxWidth: 600)
        .background(.ultraThinMaterial)
        .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg))
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottomTrailing)
        .padding(TVDesignTokens.Spacing.xxl)
    }

    private func answerButton(answer: String, index: Int) -> some View {
        Button {
            withAnimation { selectedAnswer = index }
        } label: {
            HStack {
                Text(answer)
                    .font(.system(size: TVDesignTokens.FontSize.md))
                    .foregroundStyle(DesignTokens.Text.primary)
                Spacer()
                if selectedAnswer == index {
                    Image(systemName: index == correctIndex
                        ? "checkmark.circle.fill" : "xmark.circle.fill")
                        .font(.system(size: TVDesignTokens.FontSize.md))
                        .foregroundStyle(index == correctIndex ? .green : .red)
                }
            }
            .padding(.horizontal, TVDesignTokens.Spacing.lg)
            .padding(.vertical, TVDesignTokens.Spacing.md)
            .background(answerBackground(for: index))
            .clipShape(
                RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md)
            )
        }
        .buttonStyle(.card)
    }

    private func answerBackground(for index: Int) -> some ShapeStyle {
        if selectedAnswer == index {
            return index == correctIndex
                ? AnyShapeStyle(Color.green.opacity(0.2))
                : AnyShapeStyle(Color.red.opacity(0.2))
        }
        return AnyShapeStyle(DesignTokens.Glass.bg)
    }

    private func resultLabel(isCorrect: Bool) -> some View {
        Text(
            isCorrect
                ? localization.t("onboarding.tour.trivia.correct")
                : localization.t("onboarding.tour.trivia.tryAgain")
        )
        .font(.system(size: TVDesignTokens.FontSize.md, weight: .semibold))
        .foregroundStyle(isCorrect ? .green : .orange)
    }

    private func scheduleTrivia() {
        let delaySeconds = 2.0
        DispatchQueue.main.asyncAfter(deadline: .now() + delaySeconds) {
            withAnimation(.spring(response: 0.5)) {
                showTrivia = true
            }
        }
    }
}
