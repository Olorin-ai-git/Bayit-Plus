#if os(tvOS)
import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Full-screen fallback text input for voice commands on tvOS.
/// Presented when speech recognition is unavailable. Uses the tvOS
/// system keyboard via TextField and offers preset command suggestions
/// for quick one-tap interaction with the Siri Remote.
struct TVVoiceFallbackInput: View {

    let onSubmit: (String) -> Void
    let onCancel: () -> Void

    @Environment(LocalizationManager.self) private var localization
    @State private var inputText = ""
    @FocusState private var isTextFieldFocused: Bool

    var body: some View {
        ZStack {
            DesignTokens.Background.primary
                .opacity(0.92)
                .ignoresSafeArea()

            overlayPanel
        }
        .onExitCommand { onCancel() }
        .onAppear { isTextFieldFocused = true }
    }

    // MARK: - Overlay Panel

    private var overlayPanel: some View {
        VStack(spacing: TVDesignTokens.Spacing.xl) {
            headerSection
            textInputSection
            suggestionSection
            cancelButton
        }
        .frame(maxWidth: TVDesignTokens.Form.maxWidth * 1.4)
        .padding(TVDesignTokens.Spacing.xxl)
        .background(DesignTokens.Glass.bg)
        .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.xl))
        .overlay(
            RoundedRectangle(cornerRadius: TVDesignTokens.Radius.xl)
                .stroke(DesignTokens.Glass.border, lineWidth: 1)
        )
        .shadow(
            color: DesignTokens.Glass.purpleGlow,
            radius: TVDesignTokens.Focus.shadowRadius,
            x: 0,
            y: 4
        )
    }

    // MARK: - Header

    private var headerSection: some View {
        VStack(spacing: TVDesignTokens.Spacing.sm) {
            Image(systemName: "keyboard")
                .font(.system(size: TVDesignTokens.FontSize.xxxl))
                .foregroundStyle(DesignTokens.Primary.p400)

            Text(localization.t("voiceFallback.title"))
                .font(.system(size: TVDesignTokens.FontSize.xl, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)

            Text(localization.t("voiceFallback.subtitle"))
                .font(.system(size: TVDesignTokens.FontSize.sm))
                .foregroundStyle(DesignTokens.Text.secondary)
                .multilineTextAlignment(.center)
        }
    }

    // MARK: - Text Input

    private var textInputSection: some View {
        HStack(spacing: TVDesignTokens.Spacing.md) {
            GlassTextField(
                localization.t("voiceFallback.inputPlaceholder"),
                text: $inputText,
                icon: Image(systemName: "text.cursor")
            )
            .focused($isTextFieldFocused)
            .submitLabel(.send)
            .onSubmit { submitInput() }

            GlassButton(
                localization.t("voiceFallback.send"),
                variant: .primary,
                size: .medium
            ) {
                submitInput()
            }
            .disabled(
                inputText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
            )
        }
    }

    // MARK: - Suggestion Buttons

    private var suggestionSection: some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.sm) {
            Text(localization.t("voiceFallback.suggestions"))
                .font(.system(size: TVDesignTokens.FontSize.sm, weight: .semibold))
                .foregroundStyle(DesignTokens.Text.muted)

            HStack(spacing: TVDesignTokens.Spacing.md) {
                ForEach(suggestionKeys, id: \.self) { key in
                    suggestionButton(localizationKey: key)
                }
            }
        }
    }

    private func suggestionButton(localizationKey key: String) -> some View {
        Button {
            onSubmit(localization.t(key))
        } label: {
            Text(localization.t(key))
                .font(.system(size: TVDesignTokens.FontSize.sm))
                .foregroundStyle(DesignTokens.Text.primary)
                .padding(.horizontal, TVDesignTokens.Spacing.lg)
                .padding(.vertical, TVDesignTokens.Spacing.md)
                .background(DesignTokens.Glass.bgLight)
                .clipShape(Capsule())
                .overlay(
                    Capsule()
                        .stroke(DesignTokens.Glass.border, lineWidth: 1)
                )
        }
        .buttonStyle(.plain)
        .tvFocusStyle()
        .accessibilityLabel(localization.t(key))
    }

    // MARK: - Cancel

    private var cancelButton: some View {
        GlassButton(
            localization.t("common.cancel"),
            variant: .ghost,
            size: .medium
        ) {
            onCancel()
        }
    }

    // MARK: - Actions

    private func submitInput() {
        let trimmed = inputText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }
        onSubmit(trimmed)
        inputText = ""
    }

    // MARK: - Suggestion Keys

    private var suggestionKeys: [String] {
        [
            "voiceFallback.command.play",
            "voiceFallback.command.search",
            "voiceFallback.command.home",
            "voiceFallback.command.settings"
        ]
    }
}
#endif
