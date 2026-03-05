import SwiftUI

#if os(iOS) || os(tvOS)
    import UIKit

    typealias PlatformColor = UIColor
#elseif os(macOS)
    import AppKit

    typealias PlatformColor = NSColor
#endif

public enum DesignTokens {
    public enum Colors {
        public enum Primary {
            public static let base = Color(hex: 0x7E22CE)
            public static let light = Color(hex: 0xA855F7)
            public static let dark = Color(hex: 0x581C87)
        }

        public enum Semantic {
            public static let success = Color(hex: 0x10B981)
            public static let warning = Color(hex: 0xF59E0B)
            public static let error = Color(hex: 0xEF4444)
            public static let info = Color(hex: 0x3B82F6)
        }

        public enum Text {
            public static let primary = DesignTokens.Text.primary
            public static let secondary = DesignTokens.Text.secondary
            public static let muted = DesignTokens.Text.muted
            public static let disabled = DesignTokens.Text.disabled
        }

        public enum Glass {
            public static let background = Color.black.opacity(0.7)
            public static let backgroundLight = Color.black.opacity(0.5)
            public static let border = DesignTokens.Glass.border
            public static let borderFocus = DesignTokens.Glass.borderFocus
        }

        public enum Background {
            public static let primary = DesignTokens.Background.primary
            public static let elevated = DesignTokens.Background.elevated
        }
    }

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

    public enum Secondary {
        public static let s400 = Color(hex: 0xE879F9)
        public static let s500 = Color(hex: 0xD946EF)
        public static let s600 = Color(hex: 0xC026D3)
        public static let s700 = Color(hex: 0xA21CAF)
        public static let s800 = Color(hex: 0x86198F)
        public static let `default` = s800
    }

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

    public enum Gradient {
        public static let ctaStart = Color(hex: 0x06B6D4)
        public static let ctaEnd = Color(hex: 0x7C3AED)
        public static let ctaLinear = LinearGradient(
            colors: [ctaStart, ctaEnd],
            startPoint: .leading, endPoint: .trailing
        )
    }

    public enum Glow {
        public static let blue = Color(hex: 0x3B82F6).opacity(0.3)
        public static let blueStrong = Color(hex: 0x3B82F6).opacity(0.5)
    }

    public static let live = Color(hex: 0xFF4444)
    public static let gold = Color(hex: 0xFFD700)

    // MARK: - Adaptive Glass Tokens

    public enum Glass {
        public static let bg = Color.adaptive(
            light: { PlatformColor.black.withAlphaComponent(0.04) },
            dark: { PlatformColor.white.withAlphaComponent(0.07) }
        )
        public static let bgLight = Color.adaptive(
            light: { PlatformColor.black.withAlphaComponent(0.03) },
            dark: { PlatformColor.white.withAlphaComponent(0.05) }
        )
        public static let bgMedium = Color.adaptive(
            light: { PlatformColor.black.withAlphaComponent(0.06) },
            dark: { PlatformColor.white.withAlphaComponent(0.09) }
        )
        public static let bgStrong = Color.adaptive(
            light: { PlatformColor.black.withAlphaComponent(0.09) },
            dark: { PlatformColor.white.withAlphaComponent(0.13) }
        )
        public static let border = Color.adaptive(
            light: { PlatformColor.black.withAlphaComponent(0.10) },
            dark: { PlatformColor.white.withAlphaComponent(0.12) }
        )
        public static let borderLight = Color.adaptive(
            light: { PlatformColor.black.withAlphaComponent(0.06) },
            dark: { PlatformColor.white.withAlphaComponent(0.08) }
        )
        public static let borderBright = Color.adaptive(
            light: { PlatformColor.black.withAlphaComponent(0.15) },
            dark: { PlatformColor.white.withAlphaComponent(0.28) }
        )
        public static let shadow = Color.adaptive(
            light: { PlatformColor.black.withAlphaComponent(0.08) },
            dark: { PlatformColor.black.withAlphaComponent(0.40) }
        )
        public static let borderFocus = Color(hex: 0x7E22CE).opacity(0.60)
        public static let purpleLight = Color(hex: 0x7E22CE).opacity(0.12)
        public static let purpleStrong = Color(hex: 0x7E22CE).opacity(0.22)
        public static let purpleGlow = Color(hex: 0x7E22CE).opacity(0.40)
    }

    // MARK: - Adaptive Text Tokens

    public enum Text {
        public static let primary = Color.adaptive(
            light: { PlatformColor(hex: 0x1A1A2E) },
            dark: { .white }
        )
        public static let secondary = Color.adaptive(
            light: { PlatformColor(hex: 0x1A1A2E).withAlphaComponent(0.7) },
            dark: { PlatformColor.white.withAlphaComponent(0.7) }
        )
        public static let muted = Color.adaptive(
            light: { PlatformColor(hex: 0x1A1A2E).withAlphaComponent(0.5) },
            dark: { PlatformColor.white.withAlphaComponent(0.5) }
        )
        public static let disabled = Color.adaptive(
            light: { PlatformColor(hex: 0x1A1A2E).withAlphaComponent(0.3) },
            dark: { PlatformColor.white.withAlphaComponent(0.3) }
        )
    }

    // MARK: - Adaptive Background Tokens

    public enum Background {
        public static let primary = Color.adaptive(
            light: { PlatformColor(hex: 0xF5F5FA) },
            dark: { PlatformColor(hex: 0x0D0D1A) }
        )
        public static let elevated = Color.adaptive(
            light: { .white },
            dark: { PlatformColor(hex: 0x1A1A2E) }
        )
    }

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

    public enum Radius {
        public static let sm: CGFloat = 4
        public static let `default`: CGFloat = 8
        public static let md: CGFloat = 12
        public static let lg: CGFloat = 16
        public static let xl: CGFloat = 24
        public static let xxl: CGFloat = 32
        public static let full: CGFloat = 9999
    }

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

// MARK: - Color Helpers

public extension Color {
    init(hex: UInt, alpha: Double = 1.0) {
        self.init(
            .sRGB,
            red: Double((hex >> 16) & 0xFF) / 255.0,
            green: Double((hex >> 8) & 0xFF) / 255.0,
            blue: Double(hex & 0xFF) / 255.0,
            opacity: alpha
        )
    }

    #if os(iOS) || os(tvOS)
        static func adaptive(
            light: @escaping () -> UIColor,
            dark: @escaping () -> UIColor
        ) -> Color {
            Color(uiColor: UIColor { $0.userInterfaceStyle == .dark ? dark() : light() })
        }

    #elseif os(macOS)
        static func adaptive(
            light: @escaping () -> NSColor,
            dark: @escaping () -> NSColor
        ) -> Color {
            Color(nsColor: NSColor(name: nil) { appearance in
                appearance.bestMatch(from: [.darkAqua, .aqua]) == .darkAqua ? dark() : light()
            })
        }
    #endif
}

// MARK: - PlatformColor hex initializer

extension PlatformColor {
    convenience init(hex: UInt) {
        self.init(
            red: CGFloat((hex >> 16) & 0xFF) / 255.0,
            green: CGFloat((hex >> 8) & 0xFF) / 255.0,
            blue: CGFloat(hex & 0xFF) / 255.0,
            alpha: 1.0
        )
    }
}
