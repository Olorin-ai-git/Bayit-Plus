import BayitDesignSystem
import SwiftUI

/// Chat message bubble with sent/received alignment and optional read receipt.
/// Sent messages align right with primary color; received messages align left with glass bg.
struct MessageBubble: View {
    let text: String
    let timestamp: Date
    let isSent: Bool
    let isRead: Bool

    var body: some View {
        HStack {
            if isSent { Spacer(minLength: 60) }

            VStack(alignment: isSent ? .trailing : .leading, spacing: DesignTokens.Spacing.xxs) {
                Text(text)
                    .font(.system(size: DesignTokens.FontSize.base))
                    .foregroundStyle(DesignTokens.Text.primary)
                    .padding(.horizontal, DesignTokens.Spacing.md)
                    .padding(.vertical, DesignTokens.Spacing.sm)
                    .background(bubbleBackground)
                    .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.lg))

                HStack(spacing: DesignTokens.Spacing.xs) {
                    Text(formattedTime)
                        .font(.system(size: DesignTokens.FontSize.xs))
                        .foregroundStyle(DesignTokens.Text.muted)

                    if isSent {
                        Image(systemName: isRead ? "checkmark.circle.fill" : "checkmark.circle")
                            .font(.system(size: DesignTokens.FontSize.xs))
                            .foregroundStyle(
                                isRead ? DesignTokens.Info.default : DesignTokens.Text.muted
                            )
                            .accessibilityLabel(isRead ? "Read" : "Delivered")
                    }
                }
            }

            if !isSent { Spacer(minLength: 60) }
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel(accessibilityDescription)
    }

    // MARK: - Private

    @ViewBuilder
    private var bubbleBackground: some View {
        if isSent {
            DesignTokens.Primary.p700
        } else {
            DesignTokens.Glass.bgMedium
        }
    }

    private var formattedTime: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "HH:mm"
        return formatter.string(from: timestamp)
    }

    private var accessibilityDescription: String {
        let direction = isSent ? "Sent" : "Received"
        let readStatus = isSent ? (isRead ? ", read" : ", delivered") : ""
        return "\(direction) message: \(text), \(formattedTime)\(readStatus)"
    }
}
