import BayitDesignSystem
import SwiftUI

/// Renders Hebrew text with root letters (shoresh) highlighted in amber for vocabulary learning.
/// Adapted for tvOS 10-foot viewing with larger fonts and wider word spacing.
/// Complies with WCAG AA contrast requirements (amber #FFA500 on black background).
struct TVShoreshHighlightView: View {
    let words: [HighlightedWord]

    private let rootColor = DesignTokens.Hebrew.rootHighlight
    private let normalColor = Color.white

    var body: some View {
        HStack(spacing: TVDesignTokens.Spacing.xs) {
            ForEach(words) { word in
                wordView(word)
            }
        }
        .padding(.horizontal, TVDesignTokens.Spacing.md)
        .padding(.vertical, TVDesignTokens.Spacing.sm)
        .background(Color.black.opacity(0.6))
        .cornerRadius(TVDesignTokens.Radius.sm)
        .environment(\.layoutDirection, .rightToLeft)
        .accessibilityElement(children: .combine)
        .accessibilityLabel(accessibilityText)
    }

    // MARK: - Word View

    private func wordView(_ word: HighlightedWord) -> some View {
        HStack(spacing: 0) {
            ForEach(word.characters) { char in
                Text(String(char.character))
                    .font(.system(
                        size: TVDesignTokens.FontSize.lg,
                        weight: char.isRoot ? .bold : .regular
                    ))
                    .foregroundColor(char.isRoot ? rootColor : normalColor)
            }
        }
    }

    // MARK: - Accessibility

    private var accessibilityText: String {
        let wordsText = words.map { $0.originalWord }.joined(separator: " ")
        return "Root letters highlighted in \(wordsText)"
    }
}
