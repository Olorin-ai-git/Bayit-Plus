import SwiftUI

/// Olorin Design System tokens ported from @olorin/design-tokens
/// All color values match the TypeScript design token definitions exactly
public enum DesignTokens {

    /// Namespace for all color tokens, mirrors the TypeScript theme.colors structure.
    public enum Colors {
        /// Primary brand purple palette
        public enum Primary {
            public static let base = Color(hex: 0x7E22CE)
            public static let light = Color(hex: 0xA855F7)
            public static let dark = Color(hex: 0x581C87)
        }

        /// Semantic feedback colors
        public enum Semantic {
            public static let success = Color(hex: 0x10B981)
            public static let warning = Color(hex: 0xF59E0B)
            public static let error = Color(hex: 0xEF4444)
            public static let info = Color(hex: 0x3B82F6)
        }

        /// Text colors for dark mode
        public enum Text {
            public static let primary = Color.white
            public static let secondary = Color.white.opacity(0.7)
            public static let muted = Color.white.opacity(0.5)
            public static let disabled = Color.white.opacity(0.3)
        }

        /// Glass/glassmorphism overlay colors
        public enum Glass {
            public static let background = Color.black.opacity(0.7)
            public static let backgroundLight = Color.black.opacity(0.5)
            public static let border = Color(hex: 0x7E22CE).opacity(0.25)
            public static let borderFocus = Color(hex: 0x7E22CE).opacity(0.7)
        }

        /// Surface/background colors
        public enum Background {
            public static let primary = Color(hex: 0x0D0D1A)
            public static let elevated = Color(hex: 0x1A1A2E)
        }
    }

    // MARK: - Primary Purple (Brand) - raw scale
    public enum Primary {
        public static let p50 = Color(hex: 0xFAF5FF)
        public static let p100 = Color(hex: 0xF3E8FF)
        public static let p200 = Color(hex: 0xE9D5FF)
        public static let p300 = Color(hex: 0xD8B4FE)
        public static let p400 = Color(hex: 0xC084FC)
        public static let p500 = Color(hex: 0xA855F7)
        public static let p600 = Color(hex: 0x9333EA)
        public static let p700 = Color(hex: 0x7E22CE)
        public static let p800 = Color(hex: 0x6B21A8)
        public static let p900 = Color(hex: 0x581C87)
        public static let p950 = Color(hex: 0x3B0764)
        public static let `default` = p700
    }

    // MARK: - Secondary Purple (Accents)
    public enum Secondary {
        public static let s400 = Color(hex: 0xE879F9)
        public static let s500 = Color(hex: 0xD946EF)
        public static let s600 = Color(hex: 0xC026D3)
        public static let s700 = Color(hex: 0xA21CAF)
        public static let s800 = Color(hex: 0x86198F)
        public static let `default` = s800
    }

    // MARK: - Semantic Colors
    public enum Success {
        public static let s400 = Color(hex: 0x4ADE80)
        public static let s500 = Color(hex: 0x10B981)
        public static let s600 = Color(hex: 0x059669)
        public static let `default` = s500
    }

    public enum Warning {
        public static let w400 = Color(hex: 0xFBBF24)
        public static let w500 = Color(hex: 0xF59E0B)
        public static let w600 = Color(hex: 0xD97706)
        public static let `default` = w500
    }

    public enum ErrorColor {
        public static let e400 = Color(hex: 0xF87171)
        public static let e500 = Color(hex: 0xEF4444)
        public static let e600 = Color(hex: 0xDC2626)
        public static let `default` = e500
    }

    public enum Info {
        public static let i400 = Color(hex: 0x60A5FA)
        public static let i500 = Color(hex: 0x3B82F6)
        public static let i600 = Color(hex: 0x2563EB)
        public static let `default` = i500
    }

    // MARK: - Special Colors
    public static let live = Color(hex: 0xFF4444)
    public static let gold = Color(hex: 0xFFD700)

    // MARK: - Glass Colors
    public enum Glass {
        public static let bg = Color.black.opacity(0.7)
        public static let bgLight = Color.black.opacity(0.5)
        public static let bgMedium = Color.black.opacity(0.6)
        public static let bgStrong = Color.black.opacity(0.85)
        public static let border = Color(hex: 0x7E22CE).opacity(0.25)
        public static let borderLight = Color(hex: 0x7E22CE).opacity(0.15)
        public static let borderFocus = Color(hex: 0x7E22CE).opacity(0.7)
        public static let purpleLight = Color(hex: 0x581C87).opacity(0.35)
        public static let purpleStrong = Color(hex: 0x581C87).opacity(0.55)
        public static let purpleGlow = Color(hex: 0x7E22CE).opacity(0.35)
    }

    // MARK: - Text Colors (Dark Mode)
    public enum Text {
        public static let primary = Color.white
        public static let secondary = Color.white.opacity(0.7)
        public static let muted = Color.white.opacity(0.5)
        public static let disabled = Color.white.opacity(0.3)
    }

    // MARK: - Spacing (4-point grid)
    public enum Spacing {
        public static let xxs: CGFloat = 2
        public static let xs: CGFloat = 4
        public static let sm: CGFloat = 8
        public static let md: CGFloat = 12
        public static let base: CGFloat = 16
        public static let lg: CGFloat = 20
        public static let xl: CGFloat = 24
        public static let xxl: CGFloat = 32
        public static let xxxl: CGFloat = 40
        public static let xxxxl: CGFloat = 48
    }

    // MARK: - Border Radius
    public enum Radius {
        public static let sm: CGFloat = 4
        public static let `default`: CGFloat = 8
        public static let md: CGFloat = 12
        public static let lg: CGFloat = 16
        public static let xl: CGFloat = 24
        public static let xxl: CGFloat = 32
        public static let full: CGFloat = 9999
    }

    // MARK: - Typography (SF Pro scale)
    public enum FontSize {
        public static let xs: CGFloat = 10
        public static let sm: CGFloat = 12
        public static let base: CGFloat = 14
        public static let md: CGFloat = 16
        public static let lg: CGFloat = 18
        public static let xl: CGFloat = 20
        public static let xxl: CGFloat = 24
        public static let xxxl: CGFloat = 30
        public static let display: CGFloat = 36
        public static let hero: CGFloat = 48
    }
}

// MARK: - Color Hex Extension

extension Color {
    init(hex: UInt, alpha: Double = 1.0) {
        self.init(
            .sRGB,
            red: Double((hex >> 16) & 0xFF) / 255.0,
            green: Double((hex >> 8) & 0xFF) / 255.0,
            blue: Double(hex & 0xFF) / 255.0,
            opacity: alpha
        )
    }
}
