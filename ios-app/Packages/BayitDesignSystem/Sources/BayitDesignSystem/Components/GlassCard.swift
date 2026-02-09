import SwiftUI

/// Glass-styled card container matching the @bayit/glass GlassCard component
public struct GlassCard<Content: View>: View {
    let radius: CGFloat
    let padding: CGFloat
    let content: () -> Content

    public init(
        radius: CGFloat = DesignTokens.Radius.lg,
        padding: CGFloat = DesignTokens.Spacing.base,
        @ViewBuilder content: @escaping () -> Content
    ) {
        self.radius = radius
        self.padding = padding
        self.content = content
    }

    public var body: some View {
        content()
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
                    .stroke(DesignTokens.Glass.border, lineWidth: 1)
            )
            .shadow(
                color: DesignTokens.Glass.purpleGlow,
                radius: 4,
                x: 0,
                y: 2
            )
            #if os(tvOS)
            .tvFocusStyle()
            #endif
    }
}
