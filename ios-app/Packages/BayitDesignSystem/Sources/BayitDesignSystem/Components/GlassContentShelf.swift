#if os(tvOS)
import SwiftUI

/// Horizontal content shelf for tvOS.
/// Displays a titled row of focusable content items.
/// When `maxItems` is set, shows only that many items in a single row (no scroll).
/// When `seeAllAction` is provided, the header shows a focusable "Show All" button.
/// Follows Apple TV HIG for content browsing rows.
public struct GlassContentShelf<Item: Identifiable, ItemView: View>: View {
    let title: String
    let items: [Item]
    let itemWidth: CGFloat
    let maxItems: Int?
    let seeAllAction: (() -> Void)?
    let itemBuilder: (Item) -> ItemView

    public init(
        title: String,
        items: [Item],
        itemWidth: CGFloat = TVDesignTokens.MinSize.posterWidth,
        maxItems: Int? = nil,
        seeAllAction: (() -> Void)? = nil,
        @ViewBuilder itemBuilder: @escaping (Item) -> ItemView
    ) {
        self.title = title
        self.items = items
        self.itemWidth = itemWidth
        self.maxItems = maxItems
        self.seeAllAction = seeAllAction
        self.itemBuilder = itemBuilder
    }

    private var displayItems: [Item] {
        if let maxItems {
            return Array(items.prefix(maxItems))
        }
        return items
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.md) {
            shelfHeader

            if maxItems != nil {
                // Fixed row -- no horizontal scroll
                HStack(spacing: TVDesignTokens.Spacing.focusGap) {
                    ForEach(displayItems) { item in
                        itemBuilder(item)
                            .frame(width: itemWidth)
                            .tvFocusStyle()
                    }
                }
                .padding(.horizontal, TVDesignTokens.Spacing.xl)
                .padding(.vertical, TVDesignTokens.Spacing.md)
                .focusSection()
            } else {
                // Scrollable row
                ScrollView(.horizontal, showsIndicators: false) {
                    LazyHStack(spacing: TVDesignTokens.Spacing.focusGap) {
                        ForEach(displayItems) { item in
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

    // MARK: - Header with optional "Show All"

    private var shelfHeader: some View {
        HStack {
            Text(title)
                .font(.system(size: TVDesignTokens.FontSize.xl, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)

            Spacer()

            if let seeAllAction {
                Button(action: seeAllAction) {
                    HStack(spacing: TVDesignTokens.Spacing.xs) {
                        Text("Show All")
                            .font(.system(size: TVDesignTokens.FontSize.sm, weight: .medium))
                        Image(systemName: "chevron.right")
                            .font(.system(size: TVDesignTokens.FontSize.xs, weight: .semibold))
                    }
                    .foregroundStyle(DesignTokens.Text.secondary)
                    .padding(.horizontal, TVDesignTokens.Spacing.md)
                    .padding(.vertical, TVDesignTokens.Spacing.xs)
                    .background(
                        Capsule()
                            .fill(Color.white.opacity(0.06))
                    )
                    .overlay(
                        Capsule()
                            .stroke(Color.white.opacity(0.1), lineWidth: 1)
                    )
                }
                .buttonStyle(.card)
                .tvFocusStyle(
                    scale: 1.04,
                    shadowRadius: TVDesignTokens.Focus.shadowRadius / 2
                )
            }
        }
        .padding(.horizontal, TVDesignTokens.Spacing.xl)
    }
}
#endif
