#if os(iOS)
import BayitDesignSystem
import SwiftUI

/// Vocabulary tab showing relevant terms from current content.
struct CompanionVocabularyTab: View {
    let viewModel: AICompanionViewModel

    var body: some View {
        ScrollView(.vertical, showsIndicators: true) {
            VStack(spacing: DesignTokens.Spacing.md) {
                if viewModel.words.isEmpty {
                    emptyState
                } else {
                    ForEach(viewModel.words) { word in
                        wordCard(word)
                    }
                }
            }
            .padding(.horizontal, DesignTokens.Spacing.base)
            .padding(.vertical, DesignTokens.Spacing.md)
        }
    }

    private func wordCard(_ word: VocabularyWord) -> some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
            HStack {
                Text(word.term)
                    .font(.system(size: DesignTokens.FontSize.md, weight: .semibold))
                    .foregroundStyle(DesignTokens.Text.primary)

                if let lang = word.language {
                    Text(lang.uppercased())
                        .font(.system(size: DesignTokens.FontSize.xs, weight: .medium))
                        .foregroundStyle(DesignTokens.Primary.p300)
                        .padding(.horizontal, DesignTokens.Spacing.xs)
                        .padding(.vertical, 2)
                        .background(DesignTokens.Glass.purpleLight)
                        .clipShape(Capsule())
                }

                Spacer()
            }

            if let pronunciation = word.pronunciation {
                Text(pronunciation)
                    .font(.system(size: DesignTokens.FontSize.sm))
                    .foregroundStyle(DesignTokens.Text.muted)
            }

            Text(word.definition)
                .font(.system(size: DesignTokens.FontSize.sm))
                .foregroundStyle(DesignTokens.Text.secondary)
        }
        .padding(DesignTokens.Spacing.md)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(DesignTokens.Glass.bgLight)
        .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
    }

    private var emptyState: some View {
        VStack(spacing: DesignTokens.Spacing.md) {
            Spacer()
            Image(systemName: "textformat.abc")
                .font(.system(size: 32))
                .foregroundStyle(DesignTokens.Text.muted)
            Text("No vocabulary available yet")
                .font(.system(size: DesignTokens.FontSize.sm))
                .foregroundStyle(DesignTokens.Text.muted)
            Spacer()
        }
        .frame(maxWidth: .infinity)
    }
}
#endif
