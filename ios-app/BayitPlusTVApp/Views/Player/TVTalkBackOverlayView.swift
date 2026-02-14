#if os(tvOS)
import BayitCore
import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// tvOS Talk Back overlay - uses multiple-choice instead of microphone.
/// Focus-navigable with Siri Remote for 10-foot UI interaction.
struct TVTalkBackOverlayView: View {

    @Bindable var viewModel: TalkBackViewModel
    let sessionId: String
    let contentId: String
    let profileId: String

    @State private var selectedIndex: Int?
    @State private var showResult = false

    private let logger = BayitLogger(category: "TVTalkBack")

    var body: some View {
        Group {
            if viewModel.state != .idle {
                overlayContent
                    .transition(.opacity.combined(with: .scale(scale: 0.95)))
            }
        }
        .animation(.spring(response: 0.35, dampingFraction: 0.8), value: viewModel.state)
    }

    private var overlayContent: some View {
        VStack(spacing: TVDesignTokens.Spacing.xl) {
            switch viewModel.state {
            case .idle: EmptyView()
            case .question: questionView
            case .listening, .evaluating: evaluatingView
            case .result: resultView
            }
        }
        .padding(TVDesignTokens.Spacing.xxxxl)
        .frame(maxWidth: 800)
        .background(DesignTokens.Glass.bgStrong)
        .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.xl))
        .overlay(
            RoundedRectangle(cornerRadius: TVDesignTokens.Radius.xl)
                .stroke(DesignTokens.Glass.border, lineWidth: 2)
        )
        .shadow(color: DesignTokens.Glass.purpleGlow, radius: 16, x: 0, y: 8)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .center)
    }

    @ViewBuilder
    private var questionView: some View {
        if let point = viewModel.currentPoint {
            characterHeader(point: point)
            questionBubble(point: point)
            if let options = point.answerOptions, !options.isEmpty {
                optionsList(options: options)
            }
            submitAndSkipButtons
        }
    }

    private func characterHeader(point: TalkBackPoint) -> some View {
        HStack(spacing: TVDesignTokens.Spacing.lg) {
            ZStack {
                Circle().fill(DesignTokens.Primary.default.opacity(0.3))
                    .frame(width: 64, height: 64)
                Text(String(point.characterName.prefix(1)))
                    .font(.system(size: TVDesignTokens.FontSize.lg, weight: .bold))
                    .foregroundStyle(DesignTokens.Primary.p400)
            }
            Text(point.characterName)
                .font(.system(size: TVDesignTokens.FontSize.md, weight: .bold))
                .foregroundStyle(DesignTokens.Primary.p400)
            Spacer()
        }
    }

    private func questionBubble(point: TalkBackPoint) -> some View {
        Text(point.questionTextHe)
            .font(.system(size: TVDesignTokens.FontSize.lg, weight: .medium))
            .foregroundStyle(DesignTokens.Text.primary)
            .multilineTextAlignment(.trailing)
            .environment(\.layoutDirection, .rightToLeft)
            .padding(TVDesignTokens.Spacing.lg)
            .frame(maxWidth: .infinity, alignment: .trailing)
            .background(DesignTokens.Primary.default.opacity(0.1))
            .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md))
    }

    private func optionsList(options: [String]) -> some View {
        VStack(spacing: TVDesignTokens.Spacing.md) {
            ForEach(options.indices, id: \.self) { idx in
                optionButton(index: idx, text: options[idx])
            }
        }
    }

    private func optionButton(index: Int, text: String) -> some View {
        let isSelected = selectedIndex == index
        return Button {
            if !showResult { selectedIndex = index }
        } label: {
            HStack(spacing: TVDesignTokens.Spacing.lg) {
                Circle()
                    .strokeBorder(isSelected ? DesignTokens.Primary.p400 : DesignTokens.Text.muted, lineWidth: 3)
                    .background(Circle().fill(isSelected ? DesignTokens.Primary.p400.opacity(0.2) : .clear))
                    .frame(width: 36, height: 36)
                Text(text)
                    .font(.system(size: TVDesignTokens.FontSize.base))
                    .foregroundStyle(DesignTokens.Text.primary)
                    .environment(\.layoutDirection, .rightToLeft)
                Spacer()
            }
            .padding(TVDesignTokens.Spacing.lg)
            .frame(minHeight: TVDesignTokens.MinSize.focusableHeight)
        }
        .buttonStyle(.card)
        .disabled(showResult)
    }

    private var submitAndSkipButtons: some View {
        HStack(spacing: TVDesignTokens.Spacing.lg) {
            GlassButton("Submit", variant: .primary, size: .large) { submitAnswer() }
                .tvFocusStyle().disabled(selectedIndex == nil)
            GlassButton("Skip", variant: .ghost, size: .large) { viewModel.dismiss() }
                .tvFocusStyle()
        }
    }

    @Environment(LocalizationManager.self) private var localization

    private var evaluatingView: some View {
        VStack(spacing: TVDesignTokens.Spacing.xl) {
            GlassSpinner(size: .large)
            Text(localization.t("talkBack.evaluating"))
                .font(.system(size: TVDesignTokens.FontSize.md, weight: .medium))
                .foregroundStyle(DesignTokens.Text.secondary)
        }
        .accessibilityLabel("Evaluating your answer")
    }

    @ViewBuilder
    private var resultView: some View {
        if let evaluation = viewModel.lastEvaluation {
            TVTalkBackResultView(
                evaluation: evaluation,
                onTryAgain: {
                    selectedIndex = nil
                    showResult = false
                    viewModel.retryCurrentPoint()
                },
                onContinue: { viewModel.dismiss() }
            )
        }
    }

    private func submitAnswer() {
        guard let index = selectedIndex, let point = viewModel.currentPoint else { return }
        showResult = true
        let answerText = point.answerOptions?[safe: index] ?? ""
        Task {
            await viewModel.submitResponse(
                sessionId: sessionId, contentId: contentId,
                profileId: profileId, transcript: answerText,
                languageDetected: point.expectedLanguage
            )
        }
        logger.info("TV answer submitted", context: [
            "pointId": point.id, "selectedIndex": "\(index)"
        ])
    }
}

private extension Array {
    subscript(safe index: Index) -> Element? {
        indices.contains(index) ? self[index] : nil
    }
}
#endif
