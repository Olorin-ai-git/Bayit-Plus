import SwiftUI

// MARK: - Glass Background Modifier

#if os(iOS) || os(tvOS)
    public struct GlassBackgroundModifier: ViewModifier {
        let opacity: Double
        let blurStyle: UIBlurEffect.Style

        public func body(content: Content) -> some View {
            content.background {
                ZStack {
                    Color.adaptive(
                        light: { PlatformColor.black.withAlphaComponent(opacity * 0.08) },
                        dark: { PlatformColor.white.withAlphaComponent(opacity * 0.12) }
                    )
                    VisualEffectBlur(style: blurStyle)
                }
            }
        }
    }
#else
    public struct GlassBackgroundModifier: ViewModifier {
        let opacity: Double

        public func body(content: Content) -> some View {
            content.background {
                ZStack {
                    Color.adaptive(
                        light: { PlatformColor.black.withAlphaComponent(opacity * 0.08) },
                        dark: { PlatformColor.white.withAlphaComponent(opacity * 0.12) }
                    )
                    VisualEffectBlur()
                }
            }
        }
    }
#endif

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
        let shape = RoundedRectangle(cornerRadius: radius)
        content
            .padding(padding)
            .background {
                ZStack {
                    shape.fill(DesignTokens.Glass.bg)
                    LinearGradient(
                        colors: [DesignTokens.Glass.bgLight, .clear],
                        startPoint: .top,
                        endPoint: .center
                    )
                }
            }
            .clipShape(shape)
            .contentShape(shape)
            .overlay(
                shape.strokeBorder(
                    LinearGradient(
                        colors: [DesignTokens.Glass.borderBright, DesignTokens.Glass.border],
                        startPoint: .top,
                        endPoint: .bottom
                    ), lineWidth: 1
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
        content.shadow(color: color, radius: radius, x: x, y: y)
    }
}

// MARK: - Visual Effect Blur (cross-platform)

#if os(iOS) || os(tvOS)
    public struct VisualEffectBlur: UIViewRepresentable {
        let style: UIBlurEffect.Style

        #if os(tvOS)
            public init(style: UIBlurEffect.Style = .dark) {
                self.style = style
            }
        #else
            public init(style: UIBlurEffect.Style = .systemUltraThinMaterial) {
                self.style = style
            }
        #endif

        public func makeUIView(context _: Context) -> UIVisualEffectView {
            UIVisualEffectView(effect: UIBlurEffect(style: style))
        }

        public func updateUIView(_ uiView: UIVisualEffectView, context _: Context) {
            uiView.effect = UIBlurEffect(style: style)
        }
    }

    #if os(tvOS)
        public let defaultGlassBlurStyle: UIBlurEffect.Style = .dark
    #else
        public let defaultGlassBlurStyle: UIBlurEffect.Style = .systemUltraThinMaterial
    #endif

#else
    public struct VisualEffectBlur: NSViewRepresentable {
        public init() {}

        public func makeNSView(context _: Context) -> NSVisualEffectView {
            let view = NSVisualEffectView()
            view.material = .hudWindow
            view.blendingMode = .withinWindow
            view.state = .active
            return view
        }

        public func updateNSView(_ nsView: NSVisualEffectView, context _: Context) {
            nsView.material = .hudWindow
        }
    }
#endif

// MARK: - View Extensions

public extension View {
    #if os(iOS) || os(tvOS)
        /// Apply glass background with configurable opacity and blur.
        func glassBackground(
            opacity: Double = 0.6,
            blur: UIBlurEffect.Style = defaultGlassBlurStyle
        ) -> some View {
            modifier(GlassBackgroundModifier(opacity: opacity, blurStyle: blur))
        }
    #else
        /// Apply glass background with configurable opacity.
        func glassBackground(opacity: Double = 0.6) -> some View {
            modifier(GlassBackgroundModifier(opacity: opacity))
        }
    #endif

    /// Apply glass border with purple tint.
    func glassBorder(
        color: Color = DesignTokens.Glass.border,
        width: CGFloat = 1,
        radius: CGFloat = DesignTokens.Radius.md
    ) -> some View {
        modifier(GlassBorderModifier(color: color, width: width, radius: radius))
    }

    /// Apply glass card preset (background + border + radius + padding).
    func glassCard(
        radius: CGFloat = DesignTokens.Radius.lg,
        padding: CGFloat = DesignTokens.Spacing.base
    ) -> some View {
        modifier(GlassCardModifier(radius: radius, padding: padding))
    }

    /// Apply ambient glass shadow.
    func glassShadow(
        color: Color = DesignTokens.Glass.purpleGlow,
        radius: CGFloat = 8,
        x: CGFloat = 0,
        y: CGFloat = 2
    ) -> some View {
        modifier(GlassShadowModifier(color: color, radius: radius, x: x, y: y))
    }
}
