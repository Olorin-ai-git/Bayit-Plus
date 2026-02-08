import BayitDesignSystem
import SwiftUI

/// Text input bar with send button for chat interfaces.
/// Disabled when the text field is empty. Uses Glass design system components.
struct MessageInputBar: View {
    @Binding var text: String
    let placeholder: String
    let onSend: (String) -> Void

    @FocusState private var isFocused: Bool

    var body: some View {
        HStack(spacing: DesignTokens.Spacing.sm) {
            GlassTextField(placeholder, text: $text)
                .focused($isFocused)
                .onSubmit(handleSend)
                .accessibilityLabel("Message input")

            sendButton
        }
        .padding(.horizontal, DesignTokens.Spacing.base)
        .padding(.vertical, DesignTokens.Spacing.sm)
        .background(DesignTokens.Glass.bgStrong)
    }

    // MARK: - Subviews

    private var sendButton: some View {
        GlassButton(
            "Send",
            variant: .primary,
            size: .small,
            isDisabled: text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty,
            icon: Image(systemName: "paperplane.fill"),
            action: handleSend
        )
        .frame(width: 72)
        .accessibilityLabel("Send message")
        .accessibilityHint(
            text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
                ? "Type a message first"
                : "Sends your message"
        )
    }

    // MARK: - Actions

    private func handleSend() {
        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }
        onSend(trimmed)
        text = ""
    }
}
