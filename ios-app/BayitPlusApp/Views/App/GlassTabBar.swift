import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Glass morphism tab bar with animated selection indicator.
/// Extracted from MainTabView to keep each file under 200 lines.
struct GlassTabBar: View {
    @Environment(NavigationCoordinator.self) private var coordinator
    @Environment(LocalizationManager.self) private var localization
    @Environment(\.appConfiguration) private var appConfiguration

    var body: some View {
        HStack(spacing: 0) {
            ForEach(AppTab.visibleTabs(ownerMode: appConfiguration.ownerMode).filter { $0 != .zehAni }) { tab in
                tabBarButton(for: tab)
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.xs)
        .padding(.vertical, DesignTokens.Spacing.sm)
        .background {
            ZStack {
                DesignTokens.Glass.bgStrong
                Rectangle()
                    .fill(.ultraThinMaterial)
                    .environment(\.colorScheme, .dark)
            }
        }
        .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.xl))
        .overlay(
            RoundedRectangle(cornerRadius: DesignTokens.Radius.xl)
                .stroke(DesignTokens.Glass.border, lineWidth: 1)
        )
        .padding(.horizontal, DesignTokens.Spacing.base)
        .padding(.bottom, DesignTokens.Spacing.xs)
        .shadow(color: DesignTokens.Glass.purpleGlow, radius: DesignTokens.Spacing.sm, y: DesignTokens.Spacing.xs)
    }

    private func tabLabel(_ tab: AppTab) -> String {
        tab.hasLocalizationKey ? localization.t(tab.localizationKey) : tab.title
    }

    private func tabBarButton(for tab: AppTab) -> some View {
        let isSelected = coordinator.selectedTab == tab

        return Button {
            withAnimation(.spring(duration: 0.3, bounce: 0.15)) {
                if isSelected {
                    coordinator.popToRoot()
                } else {
                    coordinator.selectedTab = tab
                }
            }
        } label: {
            VStack(spacing: DesignTokens.Spacing.xxs) {
                Image(systemName: isSelected ? tab.selectedIconName : tab.iconName)
                    .font(.system(size: DesignTokens.FontSize.lg))
                    .symbolVariant(isSelected ? .fill : .none)

                Text(tabLabel(tab))
                    .font(.system(size: DesignTokens.FontSize.xs, weight: .medium))
            }
            .foregroundStyle(isSelected
                ? DesignTokens.Primary.p400
                : DesignTokens.Text.muted)
            .frame(maxWidth: .infinity)
            .padding(.vertical, DesignTokens.Spacing.sm)
            .background(
                isSelected
                    ? DesignTokens.Glass.borderLight
                    : Color.clear
            )
            .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
        }
        .accessibilityIdentifier("tab_\(tab.rawValue)")
        .accessibilityLabel(tabLabel(tab))
        .accessibilityAddTraits(isSelected ? .isSelected : [])
    }
}
