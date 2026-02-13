#if os(tvOS)
import BayitDesignSystem
import BayitLocalization
import SwiftUI

struct TVMissionPerksView: View {
    @Environment(LocalizationManager.self) private var localization
    let perks: [UnlockedPerk]

    var body: some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.md) {
            Text(localization.t("gamification.unlockedPerks"))
                .font(.system(size: TVDesignTokens.FontSize.lg, weight: .semibold))
                .foregroundStyle(DesignTokens.Colors.Text.primary)

            if perks.isEmpty {
                Text(localization.t("gamification.noPerksYet"))
                    .font(.system(size: TVDesignTokens.FontSize.base))
                    .foregroundStyle(DesignTokens.Colors.Text.muted)
            } else {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: TVDesignTokens.Spacing.lg) {
                        ForEach(perks, id: \.perkId) { perk in
                            perkCard(perk)
                        }
                    }
                }
            }
        }
    }

    private func perkCard(_ perk: UnlockedPerk) -> some View {
        VStack(spacing: TVDesignTokens.Spacing.md) {
            Image(systemName: perk.perkType == "outfit" ? "tshirt" : "gift")
                .font(.system(size: 64))
                .foregroundStyle(DesignTokens.Colors.Text.primary)

            Text(localization.t("gamification.perks.\(perk.perkId)"))
                .font(.system(size: TVDesignTokens.FontSize.base, weight: .semibold))
                .foregroundStyle(DesignTokens.Colors.Text.primary)
                .multilineTextAlignment(.center)
                .lineLimit(2)
        }
        .frame(width: 240, height: 240)
        .background(DesignTokens.Glass.bgMedium)
        .cornerRadius(TVDesignTokens.Radius.md)
        .focusable()
    }
}
#endif
