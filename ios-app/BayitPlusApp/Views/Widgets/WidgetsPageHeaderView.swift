import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Header for the Widgets tab with title, count, and dock toggle
struct WidgetsPageHeaderView: View {
    @Environment(LocalizationManager.self) private var localization
    let widgetCount: Int
    let isDockVisible: Bool
    let onToggleDock: () -> Void

    var body: some View {
        HStack(spacing: DesignTokens.Spacing.md) {
            iconCircle
            titleSection
            Spacer()
            dockToggleButton
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
        .padding(.top, DesignTokens.Spacing.md)
        .padding(.bottom, DesignTokens.Spacing.sm)
    }

    private var iconCircle: some View {
        ZStack {
            Circle()
                .fill(DesignTokens.Glass.bgMedium)
                .frame(width: 44, height: 44)
                .overlay(
                    Circle()
                        .stroke(DesignTokens.Glass.border, lineWidth: 1)
                )

            Image(systemName: "square.grid.2x2")
                .font(.system(size: 20))
                .foregroundColor(DesignTokens.Primary.p400)
        }
    }

    private var titleSection: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.xxs) {
            Text(localization.t("nav.widgets"))
                .font(.system(size: DesignTokens.FontSize.xxl, weight: .bold))
                .foregroundColor(DesignTokens.Text.primary)

            Text("\(widgetCount) \(localization.t("widgets.itemsTotal"))")
                .font(.system(size: DesignTokens.FontSize.sm))
                .foregroundColor(DesignTokens.Text.muted)
        }
    }

    private var dockToggleButton: some View {
        GlassButton(
            isDockVisible
                ? localization.t("widgets.hideDock")
                : localization.t("widgets.showDock"),
            variant: .ghost,
            size: .small,
            icon: Image(systemName: isDockVisible ? "eye.slash" : "eye")
        ) {
            HapticFeedbackService.impact(style: .light)
            onToggleDock()
        }
    }
}
