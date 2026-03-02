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
                    shape.fill(Color.white.opacity(0.07))
                    LinearGradient(
                        colors: [Color.white.opacity(0.05), .clear],
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
                        colors: [Color.white.opacity(0.28), Color.white.opacity(0.12)],
                        startPoint: .top,
                        endPoint: .bottom
                    ), lineWidth: 1
                )
            )
            .shadow(color: Color.black.opacity(0.40), radius: 12, y: 6)
        #if os(tvOS)
            .tvFocusStyle()
        #endif
    }
}
