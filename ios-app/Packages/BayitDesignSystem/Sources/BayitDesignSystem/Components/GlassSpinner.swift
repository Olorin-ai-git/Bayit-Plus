import SwiftUI

/// Animated glass-styled loading spinner using the design system tokens.
///
/// Renders a rotating arc with a pulsing glow effect on a glass background.
/// Use within any screen that needs to indicate a loading state.
public struct GlassSpinner: View {

    public enum Size {
        case small, medium, large

        var dimension: CGFloat {
            switch self {
            case .small: return 24
            case .medium: return 40
            case .large: return 56
            }
        }

        var lineWidth: CGFloat {
            switch self {
            case .small: return 2.5
            case .medium: return 3.5
            case .large: return 4.5
            }
        }
    }

    private let size: Size
    @State private var isAnimating = false

    public init(size: Size = .medium) {
        self.size = size
    }

    public var body: some View {
        Circle()
            .trim(from: 0, to: 0.7)
            .stroke(
                AngularGradient(
                    gradient: Gradient(colors: [
                        DesignTokens.Primary.default.opacity(0.1),
                        DesignTokens.Primary.default
                    ]),
                    center: .center
                ),
                style: StrokeStyle(
                    lineWidth: size.lineWidth,
                    lineCap: .round
                )
            )
            .frame(width: size.dimension, height: size.dimension)
            .rotationEffect(.degrees(isAnimating ? 360 : 0))
            .animation(
                .linear(duration: 0.85).repeatForever(autoreverses: false),
                value: isAnimating
            )
            .onAppear { isAnimating = true }
            .accessibilityLabel("Loading")
    }
}
