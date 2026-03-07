import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Interactive word-by-word subtitle overlay for tvOS.
/// Each word is a focusable button navigable via Siri Remote d-pad.
/// Selecting a word triggers translation lookup and shows a popover.
struct TVInteractiveSubtitleView: View {
    @Environment(LocalizationManager.self) private var localization
    @Bindable var viewModel: TVWordInteractionViewModel
    let subtitleText: String
    let onPauseAdvancement: () -> Void
    let onResumeAdvancement: () -> Void

    @FocusState private var focusedWordIndex: Int?

    var body: some View {
        VStack(spacing: TVDesignTokens.Spacing.md) {
            if viewModel.hasTranslation || viewModel.isTranslating {
                TVWordTranslationPopover(
                    translation: viewModel.translationResult,
                    isLoading: viewModel.isTranslating,
                    word: viewModel.selectedWord,
                    onSaveToGlossary: handleSaveToGlossary,
                    onDismiss: handleDismissTranslation
                )
                .transition(.opacity.combined(with: .scale(scale: 0.95)))
            }

            wordRow
        }
        .padding(.horizontal, TVDesignTokens.Spacing.xl)
        .padding(.bottom, TVDesignTokens.Spacing.lg)
        .onChange(of: subtitleText) { _, newValue in
            viewModel.parseSubtitleText(newValue)
            focusedWordIndex = nil
        }
        .onChange(of: focusedWordIndex) { _, newValue in
            if newValue != nil {
                onPauseAdvancement()
            }
        }
        .animation(.easeInOut(duration: TVDesignTokens.Focus.animationDuration), value: viewModel.hasTranslation)
    }

    // MARK: - Word Row

    private var wordRow: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: TVDesignTokens.Spacing.xs) {
                ForEach(Array(viewModel.words.enumerated()), id: \.element.id) { index, word in
                    wordButton(word: word, index: index)
                }
            }
            .padding(.horizontal, TVDesignTokens.Spacing.md)
        }
        .environment(\.layoutDirection, isRTLContent ? .rightToLeft : .leftToRight)
    }

    // MARK: - Word Button

    private func wordButton(word: TVSubtitleWord, index: Int) -> some View {
        Button {
            Task { await viewModel.selectWord(at: index) }
        } label: {
            Text(word.text)
                .font(.system(size: TVDesignTokens.FontSize.lg, weight: wordWeight(word)))
                .foregroundStyle(wordColor(word: word, index: index))
                .padding(.horizontal, TVDesignTokens.Spacing.sm)
                .padding(.vertical, TVDesignTokens.Spacing.xs)
                .background(wordBackground(index: index))
                .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.sm))
        }
        .buttonStyle(InteractiveWordButtonStyle())
        .focused($focusedWordIndex, equals: index)
        .accessibilityLabel(word.text)
        .accessibilityHint(localization.t("player.interactive.tapToTranslate"))
    }

    // MARK: - Styling Helpers

    private func wordWeight(_ word: TVSubtitleWord) -> Font.Weight {
        word.isHebrew ? .bold : .regular
    }

    private func wordColor(word: TVSubtitleWord, index: Int) -> Color {
        if viewModel.selectedWordIndex == index {
            return DesignTokens.Primary.p300
        }
        return word.isHebrew
            ? DesignTokens.Primary.default
            : DesignTokens.Colors.Text.primary
    }

    private func wordBackground(index: Int) -> some ShapeStyle {
        viewModel.selectedWordIndex == index
            ? AnyShapeStyle(DesignTokens.Primary.default.opacity(0.2))
            : AnyShapeStyle(Color.black.opacity(0.5))
    }

    private var isRTLContent: Bool {
        viewModel.words.first?.isHebrew == true
    }

    // MARK: - Actions

    private func handleSaveToGlossary() {
        guard let word = viewModel.selectedWord else { return }
        viewModel.saveToGlossary(word)
    }

    private func handleDismissTranslation() {
        viewModel.dismissTranslation()
        onResumeAdvancement()
    }
}

// MARK: - Button Style

private struct InteractiveWordButtonStyle: ButtonStyle {
    @Environment(\.isFocused) private var isFocused

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(isFocused ? TVDesignTokens.Focus.scaleAmount : 1.0)
            .shadow(
                color: isFocused ? DesignTokens.Primary.default.opacity(0.4) : .clear,
                radius: isFocused ? TVDesignTokens.Focus.shadowRadius : 0
            )
            .animation(
                .easeInOut(duration: TVDesignTokens.Focus.animationDuration),
                value: isFocused
            )
    }
}
