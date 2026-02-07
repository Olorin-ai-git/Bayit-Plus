import SwiftUI

/// Horizontal scrolling carousel with snap-to-item behavior
/// Generic component for content items with glassmorphism design
public struct GlassCarousel<Content: View, Item: Identifiable>: View {
    let items: [Item]
    let itemWidth: CGFloat
    let spacing: CGFloat
    let edgePadding: CGFloat
    let content: (Item) -> Content

    public init(
        items: [Item],
        itemWidth: CGFloat = 280,
        spacing: CGFloat = DesignTokens.Spacing.base,
        edgePadding: CGFloat = DesignTokens.Spacing.lg,
        @ViewBuilder content: @escaping (Item) -> Content
    ) {
        self.items = items
        self.itemWidth = itemWidth
        self.spacing = spacing
        self.edgePadding = edgePadding
        self.content = content
    }

    public var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            LazyHStack(spacing: spacing) {
                ForEach(items) { item in
                    content(item)
                        .frame(width: itemWidth)
                }
            }
            .scrollTargetLayout()
            .padding(.horizontal, edgePadding)
        }
        .scrollTargetBehavior(.viewAligned)
    }
}
