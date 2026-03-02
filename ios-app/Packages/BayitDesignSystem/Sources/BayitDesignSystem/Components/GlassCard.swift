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
                    Color.white.opacity(0.09)
                    VisualEffectBlur()
                }
            }
            .clipShape(RoundedRectangle(cornerRadius: radius))
            .overlay(
                RoundedRectangle(cornerRadius: radius)
                    .stroke(DesignTokens.Glass.border, lineWidth: 1)
            )
            .shadow(
                color: DesignTokens.Glass.purpleGlow,
                radius: 10,
                x: 0,
                y: 4
            )
        #if os(tvOS)
            .tvFocusStyle()
        #endif
    }
}
