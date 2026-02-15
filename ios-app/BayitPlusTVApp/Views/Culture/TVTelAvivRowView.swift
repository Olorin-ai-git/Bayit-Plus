#if os(tvOS)
import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// tvOS horizontal shelf row displaying Tel Aviv culture content.
/// Shows section header and scrollable culture cards.
struct TVTelAvivRowView: View {
    let items: [CultureItem]
    let onItemTap: (CultureItem) -> Void

    @Environment(LocalizationManager.self) private var localization

    var body: some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.md) {
            sectionHeader

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: TVDesignTokens.Spacing.focusGap) {
                    ForEach(items) { item in
                        TVCultureCardView(item: item) {
                            onItemTap(item)
                        }
                    }
                }
                .padding(.horizontal, TVDesignTokens.Spacing.xl)
            }
            .frame(height: 240)
        }
    }

    private var sectionHeader: some View {
        HStack {
            Image(systemName: "globe.asia.australia")
                .font(.system(size: TVDesignTokens.FontSize.xl))
                .foregroundStyle(DesignTokens.Secondary.default)

            Text(localization.t("cultures.telAviv"))
                .font(.system(size: TVDesignTokens.FontSize.xxl, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)
        }
        .padding(.horizontal, TVDesignTokens.Spacing.xl)
    }
}
#endif
