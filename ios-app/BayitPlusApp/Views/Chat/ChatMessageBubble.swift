import BayitDesignSystem
import SwiftUI

/// A single chat message bubble.
///
/// User messages are right-aligned with a purple glass background.
/// AI assistant messages are left-aligned with a dark glass background.
/// Includes a timestamp and role indicator.
struct ChatMessageBubble: View {

    let message: ChatMessage

    private var isUser: Bool {
        message.role == "user"
    }

    var body: some View {
        HStack(alignment: .bottom, spacing: DesignTokens.Spacing.sm) {
            if isUser { Spacer(minLength: 60) }

            if !isUser {
                avatarIcon
            }

            VStack(alignment: isUser ? .trailing : .leading, spacing: DesignTokens.Spacing.xxs) {
                Text(message.content ?? "")
                    .font(.system(size: DesignTokens.FontSize.base))
                    .foregroundStyle(DesignTokens.Text.primary)
                    .padding(.horizontal, DesignTokens.Spacing.md)
                    .padding(.vertical, DesignTokens.Spacing.sm)
                    .background(bubbleBackground)
                    .clipShape(chatBubbleShape)

                if let timestamp = message.timestamp {
                    Text(timestamp)
                        .font(.system(size: DesignTokens.FontSize.xs))
                        .foregroundStyle(DesignTokens.Text.disabled)
                        .padding(.horizontal, DesignTokens.Spacing.xs)
                }
            }

            if !isUser { Spacer(minLength: 60) }
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(isUser ? "You" : "Assistant"): \(message.content ?? "")")
    }

    // MARK: - Avatar

    private var avatarIcon: some View {
        ZStack {
            Circle()
                .fill(DesignTokens.Glass.purpleLight)
                .frame(width: 28, height: 28)

            Image(systemName: "sparkles")
                .font(.system(size: 12))
                .foregroundStyle(DesignTokens.Primary.p300)
        }
    }

    // MARK: - Bubble Styling

    private var bubbleBackground: Color {
        isUser ? DesignTokens.Glass.purpleStrong : DesignTokens.Glass.bgMedium
    }

    private var chatBubbleShape: RoundedRectangle {
        RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
    }
}

// MARK: - Typing Indicator

/// Animated typing indicator shown while the AI is generating a response.
struct ChatTypingIndicator: View {

    @State private var animating = false

    var body: some View {
        HStack(alignment: .bottom, spacing: DesignTokens.Spacing.sm) {
            ZStack {
                Circle()
                    .fill(DesignTokens.Glass.purpleLight)
                    .frame(width: 28, height: 28)

                Image(systemName: "sparkles")
                    .font(.system(size: 12))
                    .foregroundStyle(DesignTokens.Primary.p300)
            }

            HStack(spacing: DesignTokens.Spacing.xs) {
                ForEach(0 ..< 3, id: \.self) { index in
                    Circle()
                        .fill(DesignTokens.Text.muted)
                        .frame(width: 8, height: 8)
                        .scaleEffect(animating ? 1.2 : 0.7)
                        .animation(
                            .easeInOut(duration: 0.5)
                                .repeatForever(autoreverses: true)
                                .delay(Double(index) * 0.15),
                            value: animating
                        )
                }
            }
            .padding(.horizontal, DesignTokens.Spacing.md)
            .padding(.vertical, DesignTokens.Spacing.sm)
            .background(DesignTokens.Glass.bgMedium)
            .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))

            Spacer()
        }
        .onAppear { animating = true }
        .accessibilityLabel("Assistant is typing")
    }
}
