import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// fullScreenCover sort picker for tvOS search, following TVQualitySelectorView card pattern.
struct TVSearchSortView: View {
    @Environment(LocalizationManager.self) private var localization
    let currentSort: SearchSortOption
    let onSelect: (SearchSortOption) -> Void

    var body: some View {
        VStack(spacing: TVDesignTokens.Spacing.xl) {
            Spacer()

            Text(localization.t("search.sort.title"))
                .font(.system(size: TVDesignTokens.FontSize.xxl, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)

            HStack(spacing: TVDesignTokens.Spacing.focusGap) {
                ForEach(SearchSortOption.allCases, id: \.self) { option in
                    Button { onSelect(option) } label: {
                        VStack(spacing: TVDesignTokens.Spacing.md) {
                            Image(systemName: option == currentSort ? "checkmark.circle.fill" : option.iconName)
                                .font(.system(size: 32))
                                .foregroundStyle(
                                    option == currentSort
                                        ? DesignTokens.Primary.p400
                                        : DesignTokens.Text.muted
                                )

                            Text(localization.t(option.localizationKey))
                                .font(.system(size: TVDesignTokens.FontSize.lg, weight: .semibold))
                                .foregroundStyle(DesignTokens.Text.primary)
                        }
                        .frame(
                            minWidth: TVDesignTokens.MinSize.focusableWidth,
                            minHeight: TVDesignTokens.MinSize.focusableHeight
                        )
                        .padding(TVDesignTokens.Spacing.lg)
                    }
                    .tvCardStyle()
                }
            }

            Spacer()
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(DesignTokens.Background.primary)
    }
}
