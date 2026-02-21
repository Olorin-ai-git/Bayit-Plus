import BayitDesignSystem
import SwiftUI
import UIKit

extension BayitPlusTVApp {
    static func configureTabBarAppearance() {
        let darkPurple = UIColor(DesignTokens.Primary.p900)
        let brandPurple = UIColor(DesignTokens.Primary.p700)
        let lightPurple = UIColor(DesignTokens.Primary.p500)
        let bgColor = UIColor(DesignTokens.Background.primary).withAlphaComponent(0.85)

        let appearance = UITabBarAppearance()
        appearance.configureWithTransparentBackground()
        appearance.backgroundColor = bgColor

        let normalAttrs: [NSAttributedString.Key: Any] = [
            .foregroundColor: UIColor.white.withAlphaComponent(0.6),
            .font: UIFont.systemFont(ofSize: TVDesignTokens.FontSize.tab, weight: .medium),
        ]
        let focusedAttrs: [NSAttributedString.Key: Any] = [
            .foregroundColor: lightPurple,
            .font: UIFont.systemFont(ofSize: TVDesignTokens.FontSize.md, weight: .semibold),
        ]
        let selectedAttrs: [NSAttributedString.Key: Any] = [
            .foregroundColor: brandPurple,
            .font: UIFont.systemFont(ofSize: TVDesignTokens.FontSize.tab, weight: .semibold),
        ]

        for itemAppearance in [
            appearance.stackedLayoutAppearance,
            appearance.inlineLayoutAppearance,
            appearance.compactInlineLayoutAppearance,
        ] {
            itemAppearance.normal.titleTextAttributes = normalAttrs
            itemAppearance.normal.iconColor = UIColor.white.withAlphaComponent(0.6)

            itemAppearance.focused.titleTextAttributes = focusedAttrs
            itemAppearance.focused.iconColor = lightPurple
            itemAppearance.focused.badgeBackgroundColor = darkPurple

            itemAppearance.selected.titleTextAttributes = selectedAttrs
            itemAppearance.selected.iconColor = brandPurple
        }

        UITabBar.appearance().standardAppearance = appearance
        UITabBar.appearance().tintColor = lightPurple
        UITabBar.appearance().unselectedItemTintColor = UIColor.white.withAlphaComponent(0.6)
    }
}
