#if os(tvOS)
import SwiftUI

/// Horizontal scrolling content shelf for tvOS.
/// Displays a titled row of focusable content items with smooth scrolling.
/// Follows Apple TV HIG for content browsing rows.
public struct GlassContentShelf<Item: Identifiable, ItemView: View>: View {
    let title: String
    let items: [Item]
    let itemWidth: CGFloat
    let itemBuilder: (Item) -> ItemView

    public init(
        title: String,
        items: [Item],
        itemWidth: CGFloat = TVDesignTokens.MinSize.posterWidth,
        @ViewBuilder itemBuilder: @escaping (Item) -> ItemView
    ) {
        self.title = title
        self.items = items
        self.itemWidth = itemWidth
        self.itemBuilder = itemBuilder
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.md) {
            Text(title)
                .font(.system(size: TVDesignTokens.FontSize.xl, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)
                .padding(.leading, TVDesignTokens.Spacing.xl)

            ScrollView(.horizontal, showsIndicators: false) {
                LazyHStack(spacing: TVDesignTokens.Spacing.focusGap) {
                    ForEach(items) { item in
                        itemBuilder(item)
                            .frame(width: itemWidth)
                            .tvFocusStyle()
                    }
                }
                .padding(.horizontal, TVDesignTokens.Spacing.xl)
                .padding(.vertical, TVDesignTokens.Spacing.md)
            }
            .focusSection()
        }
    }
}
#endif
