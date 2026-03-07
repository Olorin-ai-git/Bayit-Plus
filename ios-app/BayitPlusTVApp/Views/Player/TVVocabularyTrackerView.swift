import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Full-screen vocabulary tracker showing words saved during the viewing session.
/// Grouped into new words and previously reviewed words.
struct TVVocabularyTrackerView: View {
    @Environment(LocalizationManager.self) private var localization
    let savedWords: [SavedVocabularyWord]
    let onDismiss: () -> Void

    var body: some View {
        ZStack {
            DesignTokens.Background.primary.ignoresSafeArea()

            VStack(spacing: TVDesignTokens.Spacing.lg) {
                header
                if savedWords.isEmpty {
                    emptyState
                } else {
                    wordListContent
                }
                Spacer()
                dismissButton
            }
            .padding(TVDesignTokens.Spacing.xxl)
        }
        .onExitCommand { onDismiss() }
    }

    // MARK: - Header

    private var header: some View {
        HStack {
            Image(systemName: "book.closed")
                .font(.system(size: TVDesignTokens.FontSize.xl))
                .foregroundStyle(DesignTokens.Primary.default)

            Text(localization.t("vocabulary.title"))
                .font(.system(size: TVDesignTokens.FontSize.xxl, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)

            Spacer()

            Text(localization.t("vocabulary.wordCount"))
                .font(.system(size: TVDesignTokens.FontSize.md))
                .foregroundStyle(DesignTokens.Text.secondary)
                +
                Text(" \(savedWords.count)")
                .font(.system(size: TVDesignTokens.FontSize.md, weight: .bold))
                .foregroundStyle(DesignTokens.Primary.default)
        }
    }

    // MARK: - Empty State

    private var emptyState: some View {
        VStack(spacing: TVDesignTokens.Spacing.lg) {
            Spacer()
            Image(systemName: "text.word.spacing")
                .font(.system(size: TVDesignTokens.FontSize.hero))
                .foregroundStyle(DesignTokens.Text.muted)

            Text(localization.t("vocabulary.empty"))
                .font(.system(size: TVDesignTokens.FontSize.xl))
                .foregroundStyle(DesignTokens.Text.secondary)
                .multilineTextAlignment(.center)

            Text(localization.t("vocabulary.emptyHint"))
                .font(.system(size: TVDesignTokens.FontSize.md))
                .foregroundStyle(DesignTokens.Text.muted)
                .multilineTextAlignment(.center)
            Spacer()
        }
        .frame(maxWidth: 600)
    }

    // MARK: - Word List

    private var wordListContent: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.lg) {
                if !newWords.isEmpty {
                    sectionHeader(
                        title: localization.t("vocabulary.newWords"),
                        count: newWords.count,
                        icon: "sparkles"
                    )
                    ForEach(newWords) { word in
                        TVVocabularyWordRow(word: word)
                    }
                }

                if !reviewedWords.isEmpty {
                    sectionHeader(
                        title: localization.t("vocabulary.reviewedWords"),
                        count: reviewedWords.count,
                        icon: "arrow.counterclockwise"
                    )
                    ForEach(reviewedWords) { word in
                        TVVocabularyWordRow(word: word)
                    }
                }
            }
        }
    }

    private func sectionHeader(title: String, count: Int, icon: String) -> some View {
        HStack(spacing: TVDesignTokens.Spacing.sm) {
            Image(systemName: icon)
                .font(.system(size: TVDesignTokens.FontSize.md))
                .foregroundStyle(DesignTokens.Primary.p300)
            Text(title)
                .font(.system(size: TVDesignTokens.FontSize.lg, weight: .semibold))
                .foregroundStyle(DesignTokens.Text.primary)
            GlassBadge(text: String(count), variant: .info)
        }
        .padding(.top, TVDesignTokens.Spacing.sm)
    }

    // MARK: - Dismiss

    private var dismissButton: some View {
        GlassButton(
            localization.t("vocabulary.close"),
            variant: .secondary,
            size: .large,
            icon: Image(systemName: "xmark.circle")
        ) {
            onDismiss()
        }
        .frame(maxWidth: 300)
        .accessibilityLabel(localization.t("vocabulary.close"))
    }

    // MARK: - Computed

    private var newWords: [SavedVocabularyWord] {
        savedWords.filter(\.isNew)
    }

    private var reviewedWords: [SavedVocabularyWord] {
        savedWords.filter { !$0.isNew }
    }
}
