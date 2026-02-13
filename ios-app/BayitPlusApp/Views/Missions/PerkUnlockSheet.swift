import BayitDesignSystem
import BayitLocalization
import SwiftUI

struct PerkUnlockSheet: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(LocalizationManager.self) private var localization

    let perk: UnlockedPerk
    let onClaim: (String) -> Void

    var body: some View {
        VStack(spacing: DesignTokens.Spacing.lg) {
            Image(systemName: perk.perkType == "outfit" ? "tshirt" : "gift")
                .font(.system(size: 64))
                .foregroundStyle(DesignTokens.Text.primary)
                .padding(.top, DesignTokens.Spacing.lg)

            Text(localization.t("gamification.perks.\(perk.perkId)"))
                .font(.system(size: DesignTokens.FontSize.xl, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)
                .multilineTextAlignment(.center)

            Text(
                localization.t(
                    "gamification.unlockedAtLevel",
                    ["level": String(perk.levelUnlocked ?? 0)]
                )
            )
            .font(.system(size: DesignTokens.FontSize.base))
            .foregroundStyle(DesignTokens.gold)

            Text(localization.t("gamification.perkDescriptions.\(perk.perkId)"))
                .font(.system(size: DesignTokens.FontSize.base))
                .foregroundStyle(DesignTokens.Text.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, DesignTokens.Spacing.lg)

            Spacer()

            VStack(spacing: DesignTokens.Spacing.md) {
                GlassButton(
                    localization.t("gamification.claim"),
                    variant: .primary
                ) {
                    HapticFeedbackService.impact(style: .medium)
                    onClaim(perk.perkId)
                    dismiss()
                }

                GlassButton(
                    localization.t("common.close"),
                    variant: .secondary
                ) {
                    dismiss()
                }
            }
            .padding(.horizontal, DesignTokens.Spacing.lg)
            .padding(.bottom, DesignTokens.Spacing.lg)
        }
        .background(DesignTokens.Background.elevated)
        .presentationDetents([.medium])
        .presentationDragIndicator(.visible)
    }
}
