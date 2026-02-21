import SwiftUI

// MARK: - App-specific Design Token Namespaces

public extension DesignTokens {
    // MARK: - Leaderboard Colors

    enum Leaderboard {
        public static let gold = DesignTokens.gold
        public static let silver = Color(hex: 0xBEBEBE)
        public static let bronze = Color(hex: 0xCD7F32)
    }

    // MARK: - Subscription Tier Colors

    enum Subscription {
        public static let premium = DesignTokens.Warning.default
        public static let family = DesignTokens.Primary.p500
    }

    // MARK: - Split Subtitle Pane Colors

    enum Subtitle {
        public static let primaryBorder = Color(hex: 0x56B5F2)
        public static let secondaryBorder = Color(hex: 0xF2B556)
    }

    // MARK: - Hebrew Language Colors

    enum Hebrew {
        public static let rootHighlight = Color(hex: 0xFFA500)
    }
}
