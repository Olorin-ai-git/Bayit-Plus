import BayitDesignSystem
import SwiftUI

/// tvOS chat message bubble scaled for 10-foot UI.
struct TVChatMessageBubble: View {

    let message: ChatMessage

    private var isUser: Bool { message.role == "user" }

    var body: some View {
        HStack(alignment: .bottom, spacing: TVDesignTokens.Spacing.md) {
            if isUser { Spacer(minLength: 120) }

            if !isUser {
                avatarIcon
            }

            VStack(alignment: isUser ? .trailing : .leading, spacing: TVDesignTokens.Spacing.xs) {
                Text(message.content ?? "")
                    .font(.system(size: TVDesignTokens.FontSize.base))
                    .foregroundStyle(DesignTokens.Text.primary)
                    .padding(.horizontal, TVDesignTokens.Spacing.lg)
                    .padding(.vertical, TVDesignTokens.Spacing.md)
                    .background(bubbleBackground)
                    .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md))

                if let timestamp = message.timestamp {
                    Text(timestamp)
                        .font(.system(size: TVDesignTokens.FontSize.xs))
                        .foregroundStyle(DesignTokens.Text.disabled)
                        .padding(.horizontal, TVDesignTokens.Spacing.sm)
                }
            }

            if !isUser { Spacer(minLength: 120) }
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(isUser ? "You" : "Assistant"): \(message.content ?? "")")
    }

    // MARK: - Avatar

    private var avatarIcon: some View {
        ZStack {
            Circle()
                .fill(DesignTokens.Glass.purpleLight)
                .frame(width: 44, height: 44)

            Image(systemName: "sparkles")
                .font(.system(size: TVDesignTokens.FontSize.sm))
                .foregroundStyle(DesignTokens.Primary.p300)
        }
    }

    // MARK: - Bubble

    private var bubbleBackground: Color {
        isUser ? DesignTokens.Glass.purpleStrong : DesignTokens.Glass.bgMedium
    }
}

// MARK: - Typing Indicator

/// Animated typing indicator for tvOS chatbot.
struct TVChatTypingIndicator: View {

    @State private var animating = false

    var body: some View {
        HStack(alignment: .bottom, spacing: TVDesignTokens.Spacing.md) {
            ZStack {
                Circle()
                    .fill(DesignTokens.Glass.purpleLight)
                    .frame(width: 44, height: 44)

                Image(systemName: "sparkles")
                    .font(.system(size: TVDesignTokens.FontSize.sm))
                    .foregroundStyle(DesignTokens.Primary.p300)
            }

            HStack(spacing: TVDesignTokens.Spacing.sm) {
                ForEach(0 ..< 3, id: \.self) { index in
                    Circle()
                        .fill(DesignTokens.Text.muted)
                        .frame(width: 12, height: 12)
                        .scaleEffect(animating ? 1.2 : 0.7)
                        .animation(
                            .easeInOut(duration: 0.5)
                                .repeatForever(autoreverses: true)
                                .delay(Double(index) * 0.15),
                            value: animating
                        )
                }
            }
            .padding(.horizontal, TVDesignTokens.Spacing.lg)
            .padding(.vertical, TVDesignTokens.Spacing.md)
            .background(DesignTokens.Glass.bgMedium)
            .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md))

            Spacer()
        }
        .onAppear { animating = true }
        .accessibilityLabel("Assistant is typing")
    }
}
