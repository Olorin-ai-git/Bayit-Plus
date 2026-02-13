#if os(tvOS)
import BayitDesignSystem
import BayitLocalization
import SwiftUI

struct TVMissionLevelCardView: View {
    @Environment(LocalizationManager.self) private var localization
    let profile: GamificationProfile

    var body: some View {
        VStack(spacing: TVDesignTokens.Spacing.lg) {
            Text("\(profile.currentLevel)")
                .font(.system(size: 96, weight: .bold))
                .foregroundStyle(DesignTokens.Colors.Text.primary)

            Text(localization.currentLanguage.isRTL ? profile.levelTitleHe : profile.levelTitle)
                .font(.system(size: TVDesignTokens.FontSize.xxl, weight: .semibold))
                .foregroundStyle(DesignTokens.gold)

            GeometryReader { geometry in
                ZStack(alignment: .leading) {
                    RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md)
                        .fill(DesignTokens.Glass.bgMedium)
                        .frame(height: 20)

                    RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md)
                        .fill(
                            LinearGradient(
                                colors: [
                                    DesignTokens.Primary.p500,
                                    DesignTokens.Primary.p400
                                ],
                                startPoint: .leading,
                                endPoint: .trailing
                            )
                        )
                        .frame(
                            width: geometry.size.width * progressValue,
                            height: 20
                        )
                }
            }
            .frame(height: 20)
            .frame(maxWidth: 800)

            Text(xpProgressText)
                .font(.system(size: TVDesignTokens.FontSize.base))
                .foregroundStyle(DesignTokens.Colors.Text.muted)
        }
        .padding(TVDesignTokens.Spacing.xl)
        .background(DesignTokens.Colors.Glass.backgroundLight)
        .cornerRadius(TVDesignTokens.Radius.lg)
    }

    private var progressValue: Double {
        guard profile.xpToNextLevel > 0 else { return 1.0 }
        return Double(profile.currentXp) / Double(profile.xpToNextLevel)
    }

    private var xpProgressText: String {
        if profile.xpToNextLevel > 0 {
            return localization.t(
                "gamification.xpProgress",
                [
                    "current": String(profile.currentXp),
                    "next": String(profile.xpToNextLevel)
                ]
            )
        } else {
            return localization.t("gamification.maxLevel")
        }
    }
}
#endif
