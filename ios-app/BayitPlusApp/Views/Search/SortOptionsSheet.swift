import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Bottom sheet presenting all available sort options for search results.
struct SortOptionsSheet: View {
    @Environment(LocalizationManager.self) private var localization
    @Binding var selectedSort: SearchSortOption
    let onDismiss: () -> Void

    var body: some View {
        VStack(spacing: 0) {
            Capsule()
                .fill(DesignTokens.Text.muted.opacity(0.4))
                .frame(width: 36, height: 4)
                .padding(.top, DesignTokens.Spacing.md)
                .padding(.bottom, DesignTokens.Spacing.sm)
                .accessibilityHidden(true)
            Text(localization.t("search.sort.title"))
                .font(.system(size: DesignTokens.FontSize.lg, weight: .semibold))
                .foregroundColor(DesignTokens.Text.primary)
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.horizontal, DesignTokens.Spacing.lg)
                .padding(.bottom, DesignTokens.Spacing.md)
                .accessibilityAddTraits(.isHeader)
            Divider()
                .background(DesignTokens.Text.muted.opacity(0.3))
            VStack(spacing: 0) {
                ForEach(SearchSortOption.allCases, id: \.self) { option in
                    optionRow(option)
                }
            }
            .padding(.top, DesignTokens.Spacing.sm)
        }
        .background(DesignTokens.Background.primary)
        .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Spacing.lg))
        .presentationDetents([.height(420)])
        .presentationDragIndicator(.hidden)
    }

    // MARK: - Option Row

    private func optionRow(_ option: SearchSortOption) -> some View {
        let selected = selectedSort == option
        return Button {
            selectedSort = option
            onDismiss()
        } label: {
            HStack(spacing: DesignTokens.Spacing.md) {
                Image(systemName: option.iconName)
                    .font(.system(size: DesignTokens.FontSize.md))
                    .foregroundColor(selected ? DesignTokens.Primary.default : DesignTokens.Text.secondary)
                    .frame(width: 24)
                    .accessibilityHidden(true)
                Text(localization.t(option.localizationKey))
                    .font(.system(size: DesignTokens.FontSize.md))
                    .foregroundColor(selected ? DesignTokens.Primary.default : DesignTokens.Text.primary)
                Spacer()
                if selected {
                    Image(systemName: "checkmark")
                        .font(.system(size: DesignTokens.FontSize.sm, weight: .semibold))
                        .foregroundColor(DesignTokens.Primary.default)
                        .accessibilityHidden(true)
                }
            }
            .padding(.horizontal, DesignTokens.Spacing.lg)
            .padding(.vertical, DesignTokens.Spacing.md)
        }
        .buttonStyle(.plain)
        .background(selected ? DesignTokens.Glass.bg : Color.clear)
        .accessibilityLabel(localization.t(option.localizationKey))
        .accessibilityAddTraits(selected ? [.isSelected, .isButton] : .isButton)
    }
}
