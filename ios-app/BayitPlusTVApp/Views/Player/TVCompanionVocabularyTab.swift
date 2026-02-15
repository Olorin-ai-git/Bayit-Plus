#if os(tvOS)
import BayitCore
import BayitDesignSystem
import BayitLocalization
import SwiftUI

struct TVCompanionVocabularyTab: View {
    @Environment(LocalizationManager.self) private var localization

    let viewModel: AICompanionViewModel
    let contentId: String

    @FocusState private var focusedWordIndex: Int?

    var body: some View {
        ScrollView(.vertical, showsIndicators: true) {
            VStack(spacing: TVDesignTokens.Spacing.lg) {
                if viewModel.words.isEmpty {
                    emptyState
                } else {
                    wordsSection
                }
            }
            .padding(.horizontal, TVDesignTokens.Spacing.xxl)
            .padding(.vertical, TVDesignTokens.Spacing.xl)
        }
        .task {
            if viewModel.words.isEmpty {
                await viewModel.loadVocabulary(contentId: contentId)
            }
        }
    }

    private var wordsSection: some View {
        LazyVGrid(
            columns: [
                GridItem(.flexible(), spacing: TVDesignTokens.Spacing.lg),
                GridItem(.flexible(), spacing: TVDesignTokens.Spacing.lg)
            ],
            spacing: TVDesignTokens.Spacing.lg
        ) {
            ForEach(Array(viewModel.words.enumerated()), id: \.element.id) { index, word in
                wordCard(word)
                    .focused($focusedWordIndex, equals: index)
            }
        }
    }

    private func wordCard(_ word: VocabularyWord) -> some View {
        Button {
        } label: {
            VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.md) {
                HStack(alignment: .top) {
                    Text(word.term)
                        .font(.system(size: TVDesignTokens.FontSize.xl, weight: .bold))
                        .foregroundStyle(DesignTokens.Text.primary)
                        .lineLimit(1)

                    Spacer()

                    if let lang = word.language {
                        languageBadge(lang)
                    }
                }

                if let pronunciation = word.pronunciation {
                    HStack(spacing: TVDesignTokens.Spacing.xs) {
                        Image(systemName: "speaker.wave.2")
                            .font(.system(size: TVDesignTokens.FontSize.sm))
                            .foregroundStyle(DesignTokens.Primary.p300)

                        Text(pronunciation)
                            .font(.system(size: TVDesignTokens.FontSize.md))
                            .foregroundStyle(DesignTokens.Text.muted)
                            .italic()
                    }
                }

                Divider()
                    .background(DesignTokens.Glass.borderLight)

                Text(word.definition)
                    .font(.system(size: TVDesignTokens.FontSize.md))
                    .foregroundStyle(DesignTokens.Text.secondary)
                    .lineLimit(4)
                    .multilineTextAlignment(.leading)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }
            .padding(TVDesignTokens.Spacing.xl)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(DesignTokens.Glass.bgLight)
            .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg))
        }
        .buttonStyle(.card)
        .tvFocusStyle()
    }

    private func languageBadge(_ language: String) -> some View {
        Text(language.uppercased())
            .font(.system(size: TVDesignTokens.FontSize.sm, weight: .bold))
            .foregroundStyle(DesignTokens.Primary.p300)
            .padding(.horizontal, TVDesignTokens.Spacing.md)
            .padding(.vertical, TVDesignTokens.Spacing.xs)
            .background(DesignTokens.Glass.purpleLight)
            .clipShape(Capsule())
    }

    private var emptyState: some View {
        VStack(spacing: TVDesignTokens.Spacing.xl) {
            Spacer()

            Image(systemName: "textformat.abc")
                .font(.system(size: TVDesignTokens.FontSize.hero))
                .foregroundStyle(DesignTokens.Text.muted)

            Text(localization.t("aiCompanion.vocabulary.empty"))
                .font(.system(size: TVDesignTokens.FontSize.lg))
                .foregroundStyle(DesignTokens.Text.muted)

            Spacer()
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}
#endif
