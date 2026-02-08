import BayitDesignSystem
import SwiftUI

/// Glass popover showing word translation details: word, transliteration, meaning, part of speech
struct TranslationPopoverView: View {
    let translation: TranslationResult
    let onDismiss: () -> Void

    var body: some View {
        ZStack {
            Color.black.opacity(0.3)
                .ignoresSafeArea()
                .onTapGesture { onDismiss() }

            GlassCard {
                VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
                    // Header with dismiss
                    HStack {
                        if let word = translation.word {
                            Text(word)
                                .font(.system(size: DesignTokens.FontSize.xl, weight: .bold))
                                .foregroundColor(DesignTokens.Text.primary)
                                .environment(\.layoutDirection, .rightToLeft)
                        }

                        Spacer()

                        Button(action: onDismiss) {
                            Image(systemName: "xmark.circle.fill")
                                .font(.system(size: 22))
                                .foregroundColor(DesignTokens.Text.muted)
                        }
                        .accessibilityLabel("Dismiss translation")
                    }

                    // Transliteration
                    if let transliteration = translation.transliteration {
                        Text(transliteration)
                            .font(.system(size: DesignTokens.FontSize.md))
                            .foregroundColor(DesignTokens.Primary.p300)
                            .italic()
                    }

                    // Translation
                    if let translated = translation.translation {
                        Text(translated)
                            .font(.system(size: DesignTokens.FontSize.lg, weight: .semibold))
                            .foregroundColor(DesignTokens.Text.primary)
                    }

                    // Part of speech
                    if let partOfSpeech = translation.partOfSpeech {
                        GlassBadge(text: partOfSpeech, variant: .info)
                    }

                    // Example sentence
                    if let example = translation.example {
                        VStack(alignment: .leading, spacing: 2) {
                            Text(example)
                                .font(.system(size: DesignTokens.FontSize.sm))
                                .foregroundColor(DesignTokens.Text.secondary)
                                .environment(\.layoutDirection, .rightToLeft)

                            if let exampleTranslation = translation.exampleTranslation {
                                Text(exampleTranslation)
                                    .font(.system(size: DesignTokens.FontSize.sm))
                                    .foregroundColor(DesignTokens.Text.muted)
                                    .italic()
                            }
                        }
                        .padding(.top, DesignTokens.Spacing.xs)
                    }
                }
                .padding(DesignTokens.Spacing.lg)
            }
            .padding(.horizontal, DesignTokens.Spacing.xl)
        }
        .transition(.opacity)
    }
}
