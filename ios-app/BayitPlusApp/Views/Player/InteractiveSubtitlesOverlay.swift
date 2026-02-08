import BayitDesignSystem
import SwiftUI
import UIKit

/// Interactive subtitle overlay with word-level tap-to-translate for Hebrew content
struct InteractiveSubtitlesOverlay: View {
    @Bindable var viewModel: InteractiveSubtitlesViewModel
    let contentId: String
    let currentTime: Double

    var body: some View {
        VStack {
            Spacer()

            if let cue = viewModel.activeCue {
                cueView(cue)
                    .padding(.horizontal, DesignTokens.Spacing.lg)
                    .padding(.bottom, DesignTokens.Spacing.xxxxl)
            }
        }
        .overlay {
            if viewModel.showTranslation, let translation = viewModel.translation {
                TranslationPopoverView(
                    translation: translation,
                    onDismiss: { viewModel.dismissTranslation() }
                )
            }
        }
        .onChange(of: currentTime) { _, newTime in
            viewModel.updateActiveCue(currentTime: newTime)
        }
        .task {
            await viewModel.loadCues(contentId: contentId, language: nil)
        }
    }

    private func cueView(_ cue: SubtitleCue) -> some View {
        HStack {
            Spacer()

            VStack(spacing: DesignTokens.Spacing.xs) {
                wordsView(cue)

                // Nikud toggle
                Button {
                    viewModel.toggleNikud()
                    Task {
                        await viewModel.loadCues(contentId: contentId, language: nil)
                    }
                } label: {
                    Image(systemName: viewModel.showNikud ? "character.textbox" : "textformat.abc")
                        .font(.system(size: 12))
                        .foregroundColor(DesignTokens.Text.muted)
                }
                .accessibilityLabel(viewModel.showNikud ? "Hide nikud" : "Show nikud")
            }

            Spacer()
        }
    }

    private func wordsView(_ cue: SubtitleCue) -> some View {
        Group {
            if let words = cue.words, !words.isEmpty {
                WrappingHStack(words: words) { word in
                    wordButton(word)
                }
                .environment(\.layoutDirection, .rightToLeft)
            } else {
                let text = viewModel.showNikud ? (cue.textNikud ?? cue.text ?? "") : (cue.text ?? "")
                Text(text)
                    .font(.system(size: DesignTokens.FontSize.lg))
                    .foregroundColor(.white)
                    .environment(\.layoutDirection, .rightToLeft)
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.md)
        .padding(.vertical, DesignTokens.Spacing.sm)
        .background(Color.black.opacity(0.6))
        .cornerRadius(DesignTokens.Radius.sm)
    }

    private func wordButton(_ word: SubtitleWord) -> some View {
        Button {
            if let wordText = word.word, word.isHebrew == true {
                let generator = UIImpactFeedbackGenerator(style: .light)
                generator.impactOccurred()
                Task { await viewModel.translateWord(wordText) }
            }
        } label: {
            Text(word.word ?? "")
                .font(.system(size: DesignTokens.FontSize.lg))
                .foregroundColor(
                    word.isHebrew == true ? DesignTokens.Primary.p300 : .white
                )
                .underline(word.isHebrew == true, color: DesignTokens.Primary.p300.opacity(0.4))
        }
        .buttonStyle(.plain)
        .disabled(viewModel.isTranslating)
        .accessibilityLabel("Translate \(word.word ?? "")")
    }
}

/// Simple wrapping horizontal layout for word-level subtitle display
private struct WrappingHStack<Content: View>: View {
    let words: [SubtitleWord]
    @ViewBuilder let content: (SubtitleWord) -> Content

    var body: some View {
        HStack(spacing: 4) {
            ForEach(words, id: \.stableId) { word in
                content(word)
            }
        }
    }
}
