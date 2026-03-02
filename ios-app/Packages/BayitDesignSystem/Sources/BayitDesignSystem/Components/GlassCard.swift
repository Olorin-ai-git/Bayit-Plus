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
                    shape.fill(Color.white.opacity(0.12))
                    LinearGradient(
                        colors: [Color.white.opacity(0.10), Color.white.opacity(0.02)],
                        startPoint: .top,
                        endPoint: .bottom
                    )
                }
            }
            .clipShape(shape)
            .overlay(
                shape.strokeBorder(Color.white.opacity(0.25), lineWidth: 1)
            )
            .shadow(color: Color.black.opacity(0.50), radius: 16, y: 8)
        #if os(tvOS)
            .tvFocusStyle()
        #endif
    }
}
