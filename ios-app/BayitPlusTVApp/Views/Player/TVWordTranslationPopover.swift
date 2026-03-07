import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Popover displaying word translation details with glossary save and dismiss actions.
/// Positioned above the interactive subtitle word row, auto-dismisses after a timeout.
struct TVWordTranslationPopover: View {
    @Environment(LocalizationManager.self) private var localization

    let translation: TranslationResult?
    let isLoading: Bool
    let word: TVSubtitleWord?
    let onSaveToGlossary: () -> Void
    let onDismiss: () -> Void

    @State private var autoDismissTask: Task<Void, Never>?

    private let autoDismissSeconds: UInt64 = 10

    var body: some View {
        VStack(alignment: .center, spacing: TVDesignTokens.Spacing.sm) {
            if isLoading {
                loadingContent
            } else if let result = translation {
                translationContent(result)
            }
        }
        .padding(TVDesignTokens.Spacing.lg)
        .frame(maxWidth: 650)
        .background(.ultraThinMaterial)
        .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.xl))
        .overlay(
            RoundedRectangle(cornerRadius: TVDesignTokens.Radius.xl)
                .stroke(DesignTokens.Glass.border, lineWidth: 1)
        )
        .focusSection()
        .onExitCommand { onDismiss() }
        .onAppear { startAutoDismissTimer() }
        .onDisappear { autoDismissTask?.cancel() }
    }

    // MARK: - Loading

    private var loadingContent: some View {
        HStack(spacing: TVDesignTokens.Spacing.md) {
            ProgressView().tint(DesignTokens.Primary.default)
            Text(localization.t("player.interactive.translating"))
                .font(.system(size: TVDesignTokens.FontSize.md))
                .foregroundStyle(DesignTokens.Text.secondary)
        }
    }

    // MARK: - Translation Content

    private func translationContent(_ result: TranslationResult) -> some View {
        VStack(alignment: .center, spacing: TVDesignTokens.Spacing.sm) {
            headerRow(result)
            transliterationRow(result)
            translationRow(result)
            partOfSpeechBadge(result)
            exampleRow(result)
            actionButtons
        }
    }

    @ViewBuilder
    private func headerRow(_ result: TranslationResult) -> some View {
        if let wordText = result.word ?? word?.text {
            Text(wordText)
                .font(.system(size: TVDesignTokens.FontSize.xxl, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)
                .environment(\.layoutDirection, isHebrewWord ? .rightToLeft : .leftToRight)
        }
    }

    @ViewBuilder
    private func transliterationRow(_ result: TranslationResult) -> some View {
        if let transliteration = result.transliteration, !transliteration.isEmpty {
            Text(transliteration)
                .font(.system(size: TVDesignTokens.FontSize.md))
                .foregroundStyle(DesignTokens.Primary.p300)
                .italic()
        }
    }

    @ViewBuilder
    private func translationRow(_ result: TranslationResult) -> some View {
        if let translated = result.translation, !translated.isEmpty {
            Text(translated)
                .font(.system(size: TVDesignTokens.FontSize.xl, weight: .semibold))
                .foregroundStyle(DesignTokens.Text.primary)
        }
    }

    @ViewBuilder
    private func partOfSpeechBadge(_ result: TranslationResult) -> some View {
        if let pos = result.partOfSpeech, !pos.isEmpty {
            GlassBadge(text: pos, variant: .info)
        }
    }

    @ViewBuilder
    private func exampleRow(_ result: TranslationResult) -> some View {
        if let example = result.example, !example.isEmpty {
            VStack(spacing: TVDesignTokens.Spacing.xxs) {
                Text(example)
                    .font(.system(size: TVDesignTokens.FontSize.sm))
                    .foregroundStyle(DesignTokens.Text.secondary)
                    .multilineTextAlignment(.center)
                    .environment(\.layoutDirection, .rightToLeft)

                if let exTrans = result.exampleTranslation, !exTrans.isEmpty {
                    Text(exTrans)
                        .font(.system(size: TVDesignTokens.FontSize.sm))
                        .foregroundStyle(DesignTokens.Text.muted)
                        .italic()
                }
            }
            .padding(.top, TVDesignTokens.Spacing.xs)
        }
    }

    // MARK: - Actions

    private var actionButtons: some View {
        HStack(spacing: TVDesignTokens.Spacing.md) {
            GlassButton(
                localization.t("player.interactive.addToGlossary"),
                variant: .primary,
                size: .medium,
                icon: Image(systemName: "plus.circle")
            ) {
                onSaveToGlossary()
            }
            .accessibilityLabel(localization.t("player.interactive.addToGlossary"))

            GlassButton(
                localization.t("player.interactive.close"),
                variant: .secondary,
                size: .medium,
                icon: Image(systemName: "xmark.circle")
            ) {
                onDismiss()
            }
            .accessibilityLabel(localization.t("player.interactive.close"))
        }
        .padding(.top, TVDesignTokens.Spacing.sm)
    }

    // MARK: - Helpers

    private var isHebrewWord: Bool {
        word?.isHebrew ?? false
    }

    private func startAutoDismissTimer() {
        autoDismissTask?.cancel()
        autoDismissTask = Task {
            try? await Task.sleep(nanoseconds: autoDismissSeconds * 1_000_000_000)
            guard !Task.isCancelled else { return }
            onDismiss()
        }
    }
}
