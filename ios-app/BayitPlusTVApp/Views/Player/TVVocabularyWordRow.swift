import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// A single vocabulary word row in the tracker, showing original word,
/// transliteration, translation, part of speech, and encounter count.
struct TVVocabularyWordRow: View {
    @Environment(LocalizationManager.self) private var localization
    let word: SavedVocabularyWord

    @FocusState private var isFocused: Bool

    var body: some View {
        HStack(spacing: TVDesignTokens.Spacing.lg) {
            originalWordSection
            Spacer()
            translationSection
            encounterBadge
        }
        .padding(.horizontal, TVDesignTokens.Spacing.lg)
        .padding(.vertical, TVDesignTokens.Spacing.md)
        .background(rowBackground)
        .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md))
        .overlay(focusRing)
        .focusable()
        .focused($isFocused)
        .scaleEffect(isFocused ? TVDesignTokens.Focus.scaleAmount : 1.0)
        .animation(
            .easeInOut(duration: TVDesignTokens.Focus.animationDuration),
            value: isFocused
        )
        .accessibilityElement(children: .combine)
        .accessibilityLabel(accessibilityText)
    }

    // MARK: - Original Word

    private var originalWordSection: some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.xxs) {
            Text(word.originalWord)
                .font(.system(size: TVDesignTokens.FontSize.xl, weight: .bold))
                .foregroundStyle(DesignTokens.Primary.default)
                .environment(\.layoutDirection, word.isHebrew ? .rightToLeft : .leftToRight)

            if let transliteration = word.transliteration, !transliteration.isEmpty {
                Text(transliteration)
                    .font(.system(size: TVDesignTokens.FontSize.sm))
                    .foregroundStyle(DesignTokens.Primary.p300)
                    .italic()
            }
        }
    }

    // MARK: - Translation

    private var translationSection: some View {
        VStack(alignment: .trailing, spacing: TVDesignTokens.Spacing.xxs) {
            if let translation = word.translation, !translation.isEmpty {
                Text(translation)
                    .font(.system(size: TVDesignTokens.FontSize.lg, weight: .semibold))
                    .foregroundStyle(DesignTokens.Text.primary)
            }

            if let pos = word.partOfSpeech, !pos.isEmpty {
                GlassBadge(text: pos, variant: .info)
            }
        }
    }

    // MARK: - Encounter Badge

    private var encounterBadge: some View {
        VStack(spacing: TVDesignTokens.Spacing.xxs) {
            Text(String(word.timesEncountered))
                .font(.system(size: TVDesignTokens.FontSize.lg, weight: .bold))
                .foregroundStyle(DesignTokens.Primary.default)
            Image(systemName: "eye")
                .font(.system(size: TVDesignTokens.FontSize.sm))
                .foregroundStyle(DesignTokens.Text.muted)
        }
        .frame(width: 60)
    }

    // MARK: - Background & Focus

    private var rowBackground: some ShapeStyle {
        AnyShapeStyle(
            isFocused
                ? DesignTokens.Glass.bgLight
                : DesignTokens.Glass.bg
        )
    }

    @ViewBuilder
    private var focusRing: some View {
        if isFocused {
            RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md)
                .stroke(
                    DesignTokens.Primary.default,
                    lineWidth: TVDesignTokens.Focus.ringWidth
                )
        }
    }

    private var accessibilityText: String {
        var parts = [word.originalWord]
        if let t = word.translation { parts.append(t) }
        parts.append(
            localization.t("vocabulary.seenTimes", ["count": String(word.timesEncountered)])
        )
        return parts.joined(separator: ", ")
    }
}
