import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Trivia demo: video with timed trivia card overlays popping in.
struct TriviaDemoView: View {
    @Environment(LocalizationManager.self) var localization
    @State private var showTrivia = false
    @State private var selectedAnswer: Int?

    private let sampleAnswers = ["Tel Aviv", "Jerusalem", "Haifa", "Eilat"]
    private let correctIndex = 1

    var body: some View {
        VStack(spacing: 0) {
            headerSection
            videoWithOverlay
        }
        .background(DesignTokens.Background.primary)
        .onAppear {
            scheduleTrivia()
        }
    }

    private var headerSection: some View {
        VStack(spacing: DesignTokens.Spacing.sm) {
            Text(localization.t("onboarding.tour.trivia.title"))
                .font(DesignTokens.Typography.title2)
                .foregroundStyle(DesignTokens.Colors.textPrimary)

            Text(localization.t("onboarding.tour.trivia.tagline"))
                .font(DesignTokens.Typography.body)
                .foregroundStyle(DesignTokens.Colors.textSecondary)
                .multilineTextAlignment(.center)
        }
        .padding(.top, DesignTokens.Spacing.xl)
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    private var videoWithOverlay: some View {
        ZStack {
            InlineVideoPlayer(assetName: "demo_live_trivia")
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))

            if showTrivia {
                triviaCard
                    .transition(.move(edge: .bottom).combined(with: .opacity))
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
        .padding(.vertical, DesignTokens.Spacing.md)
    }

    private var triviaCard: some View {
        VStack(spacing: DesignTokens.Spacing.md) {
            Text(localization.t("onboarding.tour.trivia.sampleQuestion"))
                .font(DesignTokens.Typography.headline)
                .foregroundStyle(DesignTokens.Colors.textPrimary)
                .multilineTextAlignment(.center)

            ForEach(Array(sampleAnswers.enumerated()), id: \.offset) { index, answer in
                answerRow(answer: answer, index: index)
            }
        }
        .padding(DesignTokens.Spacing.lg)
        .background(.ultraThinMaterial)
        .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
        .padding(DesignTokens.Spacing.lg)
    }

    private func answerRow(answer: String, index: Int) -> some View {
        Button {
            withAnimation { selectedAnswer = index }
        } label: {
            HStack {
                Text(answer)
                    .font(DesignTokens.Typography.body)
                    .foregroundStyle(DesignTokens.Colors.textPrimary)
                Spacer()
                if selectedAnswer == index {
                    Image(systemName: index == correctIndex ? "checkmark.circle.fill" : "xmark.circle.fill")
                        .foregroundStyle(index == correctIndex ? .green : .red)
                }
            }
            .padding(DesignTokens.Spacing.md)
            .background(answerBackground(for: index))
            .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.sm))
        }
    }

    private func answerBackground(for index: Int) -> some ShapeStyle {
        if selectedAnswer == index {
            return index == correctIndex
                ? AnyShapeStyle(Color.green.opacity(0.2))
                : AnyShapeStyle(Color.red.opacity(0.2))
        }
        return AnyShapeStyle(DesignTokens.Glass.bg)
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
