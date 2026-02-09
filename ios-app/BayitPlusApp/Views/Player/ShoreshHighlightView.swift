import BayitDesignSystem
import SwiftUI

/// Renders Hebrew text with root letters (shoresh) highlighted in amber for vocabulary learning.
/// Complies with WCAG AA contrast requirements (amber #FFA500 on black background).
struct ShoreshHighlightView: View {
    let words: [HighlightedWord]

    private let rootColor = Color(red: 1.0, green: 0.65, blue: 0) // Amber #FFA500
    private let normalColor = Color.white

    var body: some View {
        HStack(spacing: 4) {
            ForEach(words) { word in
                wordView(word)
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.md)
        .padding(.vertical, DesignTokens.Spacing.sm)
        .background(Color.black.opacity(0.6))
        .cornerRadius(DesignTokens.Radius.sm)
        .environment(\.layoutDirection, .rightToLeft)
        .accessibilityElement(children: .combine)
        .accessibilityLabel(accessibilityText)
    }

    private func wordView(_ word: HighlightedWord) -> some View {
        HStack(spacing: 0) {
            ForEach(word.characters) { char in
                Text(String(char.character))
                    .font(.system(size: DesignTokens.FontSize.lg, weight: char.isRoot ? .bold : .regular))
                    .foregroundColor(char.isRoot ? rootColor : normalColor)
            }
        }
    }

    private var accessibilityText: String {
        let wordsText = words.map { $0.originalWord }.joined(separator: " ")
        return "Root letters highlighted in \(wordsText)"
    }
}
