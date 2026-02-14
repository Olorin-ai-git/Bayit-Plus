import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Compact breadcrumb for Zeh Ani child screens: "Zeh Ani > Screen Name"
struct ZehAniBreadcrumb: View {
    @Environment(NavigationCoordinator.self) private var coordinator
    @Environment(LocalizationManager.self) private var localization

    let currentLabel: String

    var body: some View {
        HStack(spacing: DesignTokens.Spacing.xs) {
            Button {
                coordinator.pop()
            } label: {
                Text(localization.t("nav.zehAni"))
                    .font(.system(size: DesignTokens.FontSize.xs, weight: .medium))
                    .foregroundStyle(DesignTokens.Primary.p400)
            }

            Image(systemName: "chevron.right")
                .font(.system(size: 8, weight: .semibold))
                .foregroundStyle(DesignTokens.Text.muted)

            Text(currentLabel)
                .font(.system(size: DesignTokens.FontSize.xs, weight: .semibold))
                .foregroundStyle(DesignTokens.Text.secondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal, DesignTokens.Spacing.lg)
        .padding(.vertical, DesignTokens.Spacing.xs)
    }
}
