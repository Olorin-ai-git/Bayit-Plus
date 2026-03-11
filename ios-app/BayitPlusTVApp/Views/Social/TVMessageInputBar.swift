import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// tvOS text input bar with send button for chat interfaces.
/// Scaled up from iOS with larger send button and tvOS focus support.
struct TVMessageInputBar: View {
    @Environment(LocalizationManager.self) private var localization
    @Binding var text: String
    let placeholder: String
    let onSend: (String) -> Void

    var body: some View {
        HStack(spacing: TVDesignTokens.Spacing.md) {
            GlassTextField(placeholder, text: $text)
                .onSubmit(handleSend)
                .accessibilityLabel("Message input")

            GlassButton(
                localization.t("common.send"),
                variant: .primary,
                size: .medium,
                isDisabled: text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty,
                icon: Image(systemName: "paperplane.fill"),
                action: handleSend
            )
            .frame(width: 120)
            .tvFocusStyle()
            .accessibilityLabel("Send message")
            .accessibilityHint(
                text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
                    ? "Type a message first"
                    : "Sends your message"
            )
        }
        .padding(.horizontal, TVDesignTokens.Spacing.lg)
        .padding(.vertical, TVDesignTokens.Spacing.md)
        .background(DesignTokens.Glass.bgStrong)
    }

    // MARK: - Actions

    private func handleSend() {
        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }
        onSend(trimmed)
        text = ""
    }
}
