import BayitDesignSystem
import SwiftUI

/// tvOS translation popover showing word details: original word, transliteration,
/// meaning, part of speech, and example usage. Adapted for 10-foot viewing with
/// TVDesignTokens sizing and a focusable Close button replacing tap-to-dismiss.
struct TVTranslationPopoverView: View {
    let translation: TranslationResult
    let onDismiss: () -> Void

    var body: some View {
        ZStack {
            Color.black.opacity(0.3)
                .ignoresSafeArea()

            GlassCard {
                VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.md) {
                    headerSection
                    transliterationSection
                    translationSection
                    partOfSpeechSection
                    exampleSection
                    dismissButton
                }
                .padding(TVDesignTokens.Spacing.xl)
            }
            .padding(.horizontal, TVDesignTokens.Spacing.xxl)
        }
        .transition(.opacity)
        .onExitCommand { onDismiss() }
    }

    // MARK: - Header

    @ViewBuilder
    private var headerSection: some View {
        if let word = translation.word {
            Text(word)
                .font(.system(size: TVDesignTokens.FontSize.xxl, weight: .bold))
                .foregroundColor(DesignTokens.Text.primary)
                .environment(\.layoutDirection, .rightToLeft)
        }
    }

    // MARK: - Transliteration

    @ViewBuilder
    private var transliterationSection: some View {
        if let transliteration = translation.transliteration {
            Text(transliteration)
                .font(.system(size: TVDesignTokens.FontSize.md))
                .foregroundColor(DesignTokens.Primary.p300)
                .italic()
        }
    }

    // MARK: - Translation

    @ViewBuilder
    private var translationSection: some View {
        if let translated = translation.translation {
            Text(translated)
                .font(.system(size: TVDesignTokens.FontSize.xl, weight: .semibold))
                .foregroundColor(DesignTokens.Text.primary)
        }
    }

    // MARK: - Part of Speech

    @ViewBuilder
    private var partOfSpeechSection: some View {
        if let partOfSpeech = translation.partOfSpeech {
            GlassBadge(text: partOfSpeech, variant: .info)
        }
    }

    // MARK: - Example

    @ViewBuilder
    private var exampleSection: some View {
        if let example = translation.example {
            VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.xxs) {
                Text(example)
                    .font(.system(size: TVDesignTokens.FontSize.sm))
                    .foregroundColor(DesignTokens.Text.secondary)
                    .environment(\.layoutDirection, .rightToLeft)

                if let exampleTranslation = translation.exampleTranslation {
                    Text(exampleTranslation)
                        .font(.system(size: TVDesignTokens.FontSize.sm))
                        .foregroundColor(DesignTokens.Text.muted)
                        .italic()
                }
            }
            .padding(.top, TVDesignTokens.Spacing.xs)
        }
    }

    // MARK: - Dismiss Button

    private var dismissButton: some View {
        GlassButton(
            "Close",
            variant: .secondary,
            size: .medium,
            icon: Image(systemName: "xmark.circle")
        ) {
            onDismiss()
        }
        .accessibilityLabel("Dismiss translation")
        .padding(.top, TVDesignTokens.Spacing.sm)
    }
}
