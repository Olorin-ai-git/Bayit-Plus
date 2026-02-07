import SwiftUI

/// Badge component for live indicators, episode counts, status labels
/// Supports semantic color variants with glassmorphism styling
public struct GlassBadge: View {
    let text: String
    let variant: Variant

    public enum Variant {
        case live
        case primary
        case info
        case success
        case warning
        case error

        var color: Color {
            switch self {
            case .live:
                return DesignTokens.live
            case .primary:
                return DesignTokens.Primary.default
            case .info:
                return DesignTokens.Info.default
            case .success:
                return DesignTokens.Success.default
            case .warning:
                return DesignTokens.Warning.default
            case .error:
                return DesignTokens.ErrorColor.default
            }
        }
    }

    public init(
        text: String,
        variant: Variant = .primary
    ) {
        self.text = text
        self.variant = variant
    }

    public var body: some View {
        Text(text.uppercased())
            .font(.system(size: DesignTokens.FontSize.xs, weight: .bold))
            .foregroundColor(DesignTokens.Text.primary)
            .padding(.horizontal, DesignTokens.Spacing.sm)
            .padding(.vertical, DesignTokens.Spacing.xs)
            .background {
                ZStack {
                    variant.color.opacity(0.85)
                    VisualEffectBlur(style: .systemUltraThinMaterialDark)
                        .opacity(0.4)
                }
            }
            .clipShape(Capsule())
            .shadow(
                color: variant.color.opacity(0.3),
                radius: 4,
                x: 0,
                y: 2
            )
    }
}
