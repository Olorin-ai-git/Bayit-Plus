import BayitDesignSystem
import SwiftUI

/// tvOS chat message bubble with sent/received alignment and read receipt.
/// Scaled up from iOS for 10-foot UI viewing distance.
struct TVMessageBubble: View {
    let text: String
    let timestamp: Date
    let isSent: Bool
    let isRead: Bool

    var body: some View {
        HStack {
            if isSent { Spacer(minLength: 200) }

            VStack(alignment: isSent ? .trailing : .leading, spacing: TVDesignTokens.Spacing.xxs) {
                Text(text)
                    .font(.system(size: TVDesignTokens.FontSize.lg))
                    .foregroundStyle(DesignTokens.Text.primary)
                    .padding(.horizontal, TVDesignTokens.Spacing.lg)
                    .padding(.vertical, TVDesignTokens.Spacing.md)
                    .background(bubbleBackground)
                    .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg))

                HStack(spacing: TVDesignTokens.Spacing.xs) {
                    Text(formattedTime)
                        .font(.system(size: TVDesignTokens.FontSize.sm))
                        .foregroundStyle(DesignTokens.Text.muted)

                    if isSent {
                        Image(systemName: isRead ? "checkmark.circle.fill" : "checkmark.circle")
                            .font(.system(size: TVDesignTokens.FontSize.sm))
                            .foregroundStyle(
                                isRead ? DesignTokens.Info.default : DesignTokens.Text.muted
                            )
                            .accessibilityLabel(isRead ? "Read" : "Delivered")
                    }
                }
            }

            if !isSent { Spacer(minLength: 200) }
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
