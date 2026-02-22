#if os(tvOS)
    import BayitDesignSystem
    import BayitLocalization
    import SwiftUI

    /// Header for the tvOS Widgets tab: icon, title, widget count, and dock toggle.
    /// Mirrors iOS WidgetsPageHeaderView for full-parity layout.
    struct TVWidgetsPageHeaderView: View {
        @Environment(LocalizationManager.self) private var localization
        let widgetCount: Int
        let isDockVisible: Bool
        let onToggleDock: () -> Void

        var body: some View {
            HStack(spacing: TVDesignTokens.Spacing.lg) {
                iconCircle
                titleSection
                Spacer()
                dockToggleButton
            }
            .padding(.horizontal, TVDesignTokens.Spacing.xl)
            .padding(.vertical, TVDesignTokens.Spacing.md)
        }

        private var iconCircle: some View {
            ZStack {
                Circle()
                    .fill(DesignTokens.Glass.bgMedium)
                    .frame(width: 64, height: 64)
                    .overlay(Circle().stroke(DesignTokens.Glass.border, lineWidth: 1))

                Image(systemName: "square.grid.2x2")
                    .font(.system(size: 30))
                    .foregroundColor(DesignTokens.Primary.p400)
            }
        }

        private var titleSection: some View {
            VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.xxs) {
                Text(localization.t("nav.widgets"))
                    .font(.system(size: TVDesignTokens.FontSize.xxl, weight: .bold))
                    .foregroundColor(DesignTokens.Text.primary)

                Text("\(widgetCount) \(localization.t("widgets.itemsTotal"))")
                    .font(.system(size: TVDesignTokens.FontSize.base))
                    .foregroundColor(DesignTokens.Text.muted)
            }
        }

        private var dockToggleButton: some View {
            GlassButton(
                isDockVisible
                    ? localization.t("widgets.hideDock")
                    : localization.t("widgets.showDock"),
                variant: .ghost,
                size: .medium,
                icon: Image(systemName: isDockVisible ? "eye.slash" : "eye")
            ) {
                onToggleDock()
            }
        }
    }
#endif
