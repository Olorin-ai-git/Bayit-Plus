import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Text input fallback shown when microphone access is unavailable.
struct VoiceFallbackInput: View {
    @Environment(LocalizationManager.self) private var localization
    let onSubmit: (String) -> Void

    @State private var inputText = ""
    @State private var showBanner = true

    var body: some View {
        VStack(spacing: DesignTokens.Spacing.md) {
            if showBanner { micUnavailableBanner }
            inputRow
        }
        .padding(DesignTokens.Spacing.md)
    }

    private var micUnavailableBanner: some View {
        HStack(spacing: DesignTokens.Spacing.sm) {
            Image(systemName: "mic.slash")
                .font(.system(size: DesignTokens.FontSize.md))
                .foregroundStyle(DesignTokens.Warning.default)
            Text(localization.t("voiceFallback.micUnavailable"))
                .font(.system(size: DesignTokens.FontSize.sm))
                .foregroundStyle(DesignTokens.Text.secondary)
            Spacer()
            Button { withAnimation { showBanner = false } } label: {
                Image(systemName: "xmark")
                    .font(.system(size: DesignTokens.FontSize.xs))
                    .foregroundStyle(DesignTokens.Text.muted)
            }
            .accessibilityLabel(localization.t("common.dismiss"))
        }
        .padding(DesignTokens.Spacing.sm)
        .background(DesignTokens.Warning.default.opacity(0.1))
        .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.sm))
    }

    private var inputRow: some View {
        HStack(spacing: DesignTokens.Spacing.sm) {
            GlassTextField(
                localization.t("voiceFallback.inputPlaceholder"),
                text: $inputText,
                icon: Image(systemName: "keyboard")
            )
            .onSubmit { submitInput() }

            GlassButton(
                localization.t("voiceFallback.send"),
                variant: .primary,
                size: .small
            ) { submitInput() }
            .disabled(inputText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
        }
    }

    private func submitInput() {
        let trimmed = inputText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }
        onSubmit(trimmed)
        inputText = ""
    }
}
