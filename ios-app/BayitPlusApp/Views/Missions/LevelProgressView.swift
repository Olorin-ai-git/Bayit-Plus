import BayitDesignSystem
import BayitLocalization
import SwiftUI

struct LevelProgressView: View {
    @Environment(LocalizationManager.self) private var localization

    let currentXp: Int
    let xpToNextLevel: Int
    let level: Int
    let title: String

    private var progress: Double {
        guard xpToNextLevel > 0 else { return 1.0 }
        return Double(currentXp) / Double(xpToNextLevel)
    }

    var body: some View {
        VStack(spacing: DesignTokens.Spacing.sm) {
            GeometryReader { geometry in
                ZStack(alignment: .leading) {
                    RoundedRectangle(cornerRadius: DesignTokens.Radius.sm)
                        .fill(DesignTokens.Glass.bgMedium)
                        .frame(height: 12)

                    RoundedRectangle(cornerRadius: DesignTokens.Radius.sm)
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
                            width: geometry.size.width * progress,
                            height: 12
                        )
                }
            }
            .frame(height: 12)

            Text(xpProgressText)
                .font(.system(size: DesignTokens.FontSize.sm))
                .foregroundStyle(DesignTokens.Text.muted)
        }
    }

    private var xpProgressText: String {
        if xpToNextLevel > 0 {
            return localization.t(
                "gamification.xpProgress",
                replacements: [
                    "current": String(currentXp),
                    "next": String(xpToNextLevel)
                ]
            )
        } else {
            return localization.t("gamification.maxLevel")
        }
    }
}
