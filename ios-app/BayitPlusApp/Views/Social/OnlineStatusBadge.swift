import BayitDesignSystem
import SwiftUI

/// Small circle indicator showing online/offline status.
/// Green for online, gray for offline. Uses DesignTokens colors.
struct OnlineStatusBadge: View {
    let isOnline: Bool

    var body: some View {
        Circle()
            .fill(isOnline ? DesignTokens.Success.default : DesignTokens.Text.disabled)
            .frame(width: DesignTokens.Spacing.sm, height: DesignTokens.Spacing.sm)
            .overlay(
                Circle()
                    .stroke(DesignTokens.Background.primary, lineWidth: 1.5)
            )
            .accessibilityLabel(isOnline ? "Online" : "Offline")
    }
}
