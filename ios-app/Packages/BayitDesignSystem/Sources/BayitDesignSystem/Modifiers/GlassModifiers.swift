import SwiftUI

// MARK: - Glass Background Modifier

public struct GlassBackgroundModifier: ViewModifier {
    let opacity: Double
    let blurStyle: UIBlurEffect.Style

    public func body(content: Content) -> some View {
        content
            .background {
                ZStack {
                    Color.black.opacity(opacity)
                    VisualEffectBlur(style: blurStyle)
                }
            }
    }
}

// MARK: - Glass Border Modifier

public struct GlassBorderModifier: ViewModifier {
    let color: Color
    let width: CGFloat
    let radius: CGFloat

    public func body(content: Content) -> some View {
        content
            .overlay(
                RoundedRectangle(cornerRadius: radius)
                    .stroke(color, lineWidth: width)
            )
    }
}

// MARK: - Glass Card Modifier

public struct GlassCardModifier: ViewModifier {
    let radius: CGFloat
    let padding: CGFloat

    public func body(content: Content) -> some View {
        content
            .padding(padding)
            .background {
                ZStack {
                    Color.black.opacity(0.6)
                    VisualEffectBlur(style: .systemUltraThinMaterialDark)
                }
            }
            .clipShape(RoundedRectangle(cornerRadius: radius))
            .overlay(
                RoundedRectangle(cornerRadius: radius)
                    .stroke(
                        DesignTokens.Glass.border,
                        lineWidth: 1
                    )
            )
    }
}

// MARK: - Glass Shadow Modifier

public struct GlassShadowModifier: ViewModifier {
    let color: Color
    let radius: CGFloat
    let x: CGFloat
    let y: CGFloat

    public func body(content: Content) -> some View {
        content
            .shadow(color: color, radius: radius, x: x, y: y)
    }
}

// MARK: - UIVisualEffectView Wrapper

public struct VisualEffectBlur: UIViewRepresentable {
    let style: UIBlurEffect.Style

    #if os(tvOS)
    public init(style: UIBlurEffect.Style = .dark) {
        self.style = style
    }
    #else
    public init(style: UIBlurEffect.Style = .systemUltraThinMaterialDark) {
        self.style = style
    }
    #endif

    public func makeUIView(context: Context) -> UIVisualEffectView {
        UIVisualEffectView(effect: UIBlurEffect(style: style))
    }

    public func updateUIView(_ uiView: UIVisualEffectView, context: Context) {
        uiView.effect = UIBlurEffect(style: style)
    }
}

// MARK: - Platform Default Blur Style

#if os(tvOS)
public let defaultGlassBlurStyle: UIBlurEffect.Style = .dark
#else
public let defaultGlassBlurStyle: UIBlurEffect.Style = .systemUltraThinMaterialDark
#endif

// MARK: - View Extensions

extension View {
    /// Apply glass background with configurable opacity and blur
    public func glassBackground(
        opacity: Double = 0.6,
        blur: UIBlurEffect.Style = defaultGlassBlurStyle
    ) -> some View {
        modifier(GlassBackgroundModifier(opacity: opacity, blurStyle: blur))
    }

    /// Apply glass border with purple tint
    public func glassBorder(
        color: Color = DesignTokens.Glass.border,
        width: CGFloat = 1,
        radius: CGFloat = DesignTokens.Radius.md
    ) -> some View {
        modifier(GlassBorderModifier(color: color, width: width, radius: radius))
    }

    /// Apply glass card preset (background + border + radius + padding)
    public func glassCard(
        radius: CGFloat = DesignTokens.Radius.lg,
        padding: CGFloat = DesignTokens.Spacing.base
    ) -> some View {
        modifier(GlassCardModifier(radius: radius, padding: padding))
    }

    /// Apply ambient glass shadow with purple glow
    public func glassShadow(
        color: Color = DesignTokens.Glass.purpleGlow,
        radius: CGFloat = 8,
        x: CGFloat = 0,
        y: CGFloat = 4
    ) -> some View {
        modifier(GlassShadowModifier(color: color, radius: radius, x: x, y: y))
    }
}
