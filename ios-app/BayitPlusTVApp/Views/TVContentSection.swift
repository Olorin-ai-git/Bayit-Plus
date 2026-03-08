import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Reusable tvOS content section with consistent width, padding, and card layout.
/// Renders a horizontal scrolling shelf with a capitalized title and icon.
struct TVContentSection<Item, CardContent: View>: View {
    @Environment(LocalizationManager.self) private var localization
    let title: String
    let icon: String
    let items: [Item]
    let maxItems: Int?
    let seeAllAction: (() -> Void)?
    /// Optional CTA shown as a trailing ghost card when the shelf has very few items.
    let supplementaryAction: (() -> Void)?
    let supplementaryLabel: String?
    let cardBuilder: (Item) -> CardContent

    init(
        title: String,
        icon: String,
        items: [Item],
        maxItems: Int? = nil,
        seeAllAction: (() -> Void)? = nil,
        supplementaryAction: (() -> Void)? = nil,
        supplementaryLabel: String? = nil,
        @ViewBuilder cardBuilder: @escaping (Item) -> CardContent
    ) {
        self.title = title
        self.icon = icon
        self.items = items
        self.maxItems = maxItems
        self.seeAllAction = seeAllAction
        self.supplementaryAction = supplementaryAction
        self.supplementaryLabel = supplementaryLabel
        self.cardBuilder = cardBuilder
    }

    private func browseCTACard(label: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            VStack(spacing: TVDesignTokens.Spacing.md) {
                Image(systemName: "chevron.right.circle")
                    .font(.system(size: 48, weight: .light))
                    .foregroundStyle(DesignTokens.Primary.p400)
                Text(label)
                    .font(.system(size: TVDesignTokens.FontSize.md, weight: .medium))
                    .foregroundStyle(DesignTokens.Text.secondary)
                    .multilineTextAlignment(.center)
            }
            .frame(width: 360, height: 220)
            .background(DesignTokens.Glass.bg)
            .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.poster))
        }
        .tvCardStyle()
    }

    private var visibleItems: [Item] {
        if let maxItems = maxItems {
            return Array(items.prefix(maxItems))
        }
        return items
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

                if let action = seeAllAction {
                    Button(action: action) {
                        HStack(spacing: TVDesignTokens.Spacing.sm) {
                            Text(localization.t("tvos.common.seeAll"))
                                .font(.system(size: TVDesignTokens.FontSize.md, weight: .semibold))
                                .foregroundStyle(DesignTokens.Primary.default)

                            Image(systemName: "chevron.right")
                                .font(.system(size: TVDesignTokens.FontSize.md, weight: .semibold))
                                .foregroundStyle(DesignTokens.Primary.default)
                        }
                        .padding(.horizontal, TVDesignTokens.Spacing.md)
                        .padding(.vertical, TVDesignTokens.Spacing.sm)
                    }
                    .tvCardStyle()
                }
            }
            .focusSection()

            // Horizontal scrolling cards — extra horizontal padding lets scaled cards
            // overflow without being clipped by the section's rounded rect boundary.
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(alignment: .top, spacing: TVDesignTokens.Spacing.focusGap) {
                    ForEach(Array(visibleItems.indices), id: \.self) { index in
                        cardBuilder(visibleItems[index])
                    }
                    if let action = supplementaryAction, let label = supplementaryLabel {
                        browseCTACard(label: label, action: action)
                    }
                }
                .padding(.vertical, TVDesignTokens.Spacing.lg)
                .padding(.horizontal, TVDesignTokens.Spacing.md)
            }
            .focusSection()
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.vertical, TVDesignTokens.Spacing.lg)
        .padding(.horizontal, TVDesignTokens.Spacing.xxl)
        // Use background+overlay for the glass shape without clipShape so focused
        // cards can scale beyond the section boundary without being clipped.
        .background(
            RoundedRectangle(cornerRadius: TVDesignTokens.Radius.xl)
                .fill(Color.white.opacity(0.04))
                .background(
                    RoundedRectangle(cornerRadius: TVDesignTokens.Radius.xl)
                        .fill(.ultraThinMaterial.opacity(0.2))
                )
                .overlay(
                    RoundedRectangle(cornerRadius: TVDesignTokens.Radius.xl)
                        .stroke(Color.white.opacity(0.1), lineWidth: 2)
                )
        )
        .focusSection()
    }
}
