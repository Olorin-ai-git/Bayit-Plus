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
                .foregroundStyle(TVDesignTokens.Text.primary)

            Text(localization.isRTL ? profile.levelTitleHe : profile.levelTitle)
                .font(.system(size: TVDesignTokens.FontSize.xxl, weight: .semibold))
                .foregroundStyle(TVDesignTokens.gold)

            GeometryReader { geometry in
                ZStack(alignment: .leading) {
                    RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md)
                        .fill(TVDesignTokens.Glass.bgMedium)
                        .frame(height: 20)

                    RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md)
                        .fill(
                            LinearGradient(
                                colors: [
                                    TVDesignTokens.Primary.p500,
                                    TVDesignTokens.Primary.p400
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
                .foregroundStyle(TVDesignTokens.Text.muted)
        }
        .padding(TVDesignTokens.Spacing.xl)
        .background(TVDesignTokens.Glass.bgLight)
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
                replacements: [
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
