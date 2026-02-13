import BayitDesignSystem
import SwiftUI

/// Reusable tvOS content section with consistent width, padding, and card layout.
/// Renders a horizontal scrolling shelf with a capitalized title and icon.
struct TVContentSection<Item, CardContent: View>: View {
    let title: String
    let icon: String
    let items: [Item]
    let maxItems: Int
    let seeAllAction: (() -> Void)?
    let cardBuilder: (Item) -> CardContent

    /// Section width with horizontal padding on each side
    private let sectionPadding = TVDesignTokens.Spacing.xxl

    init(
        title: String,
        icon: String,
        items: [Item],
        maxItems: Int = 5,
        seeAllAction: (() -> Void)? = nil,
        @ViewBuilder cardBuilder: @escaping (Item) -> CardContent
    ) {
        self.title = title
        self.icon = icon
        self.items = items
        self.maxItems = maxItems
        self.seeAllAction = seeAllAction
        self.cardBuilder = cardBuilder
    }

    private var visibleItems: ArraySlice<Item> {
        items.prefix(maxItems)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.lg) {
            // Section header with optional See All button
            HStack(spacing: TVDesignTokens.Spacing.md) {
                Image(systemName: icon)
                    .font(.system(size: TVDesignTokens.FontSize.lg, weight: .semibold))
                    .foregroundStyle(DesignTokens.Primary.default)

                Text(title.localizedCapitalized)
                    .font(.system(size: TVDesignTokens.FontSize.xl, weight: .bold))
                    .foregroundStyle(DesignTokens.Text.primary)

                Spacer()

                if items.count > maxItems, let action = seeAllAction {
                    Button(action: action) {
                        HStack(spacing: TVDesignTokens.Spacing.sm) {
                            Text("See All")
                                .font(.system(size: TVDesignTokens.FontSize.md))
                                .foregroundStyle(DesignTokens.Primary.default)

                            Image(systemName: "chevron.right")
                                .font(.system(size: TVDesignTokens.FontSize.md, weight: .semibold))
                                .foregroundStyle(DesignTokens.Primary.default)
                        }
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(.horizontal, sectionPadding)

            // Horizontal scrolling cards
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: TVDesignTokens.Spacing.focusGap) {
                    ForEach(Array(visibleItems.indices), id: \.self) { index in
                        cardBuilder(visibleItems[index])
                    }
                }
                .padding(.horizontal, sectionPadding)
                .padding(.vertical, TVDesignTokens.Spacing.md)
            }
            .clipped()
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.vertical, TVDesignTokens.Spacing.lg)
        .background(
            RoundedRectangle(cornerRadius: TVDesignTokens.Radius.xl)
                .fill(Color.white.opacity(0.04))
                .background(
                    RoundedRectangle(cornerRadius: TVDesignTokens.Radius.xl)
                        .fill(.ultraThinMaterial.opacity(0.2))
                )
        )
        .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.xl))
        .overlay(
            RoundedRectangle(cornerRadius: TVDesignTokens.Radius.xl)
                .stroke(Color.white.opacity(0.1), lineWidth: 2)
        )
        .padding(.horizontal, sectionPadding)
        .focusSection()
    }
}
