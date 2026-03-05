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
        let shape = RoundedRectangle(cornerRadius: radius)
        content()
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
            .shadow(color: DesignTokens.Glass.shadow, radius: 12, y: 6)
        #if os(tvOS)
            .tvFocusStyle()
        #endif
    }
}
