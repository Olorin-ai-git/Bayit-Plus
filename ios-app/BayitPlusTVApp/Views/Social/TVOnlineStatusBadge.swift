import BayitDesignSystem
import SwiftUI

/// tvOS online/offline status indicator circle.
/// Green for online, gray for offline. Scaled up for 10-foot UI.
struct TVOnlineStatusBadge: View {
    let isOnline: Bool

    var body: some View {
        Circle()
            .fill(isOnline ? DesignTokens.Success.default : DesignTokens.Text.disabled)
            .frame(width: TVDesignTokens.Spacing.md, height: TVDesignTokens.Spacing.md)
            .overlay(
                Circle()
                    .stroke(DesignTokens.Background.primary, lineWidth: 2.5)
            )
            .accessibilityLabel(isOnline ? "Online" : "Offline")
    }
}
