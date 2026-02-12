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
                    replacements: ["level": String(perk.levelUnlocked)]
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

struct UnlockedPerk: Codable, Identifiable {
    let perkId: String
    let perkType: String
    let levelUnlocked: Int
    let unlockedAt: String

    var id: String { perkId }

    enum CodingKeys: String, CodingKey {
        case perkId = "perk_id"
        case perkType = "perk_type"
        case levelUnlocked = "level_unlocked"
        case unlockedAt = "unlocked_at"
    }
}

struct GamificationProfile: Codable {
    let currentLevel: Int
    let currentXp: Int
    let totalXp: Int
    let xpToNextLevel: Int
    let levelTitle: String
    let levelTitleHe: String
    let unlockedPerks: [UnlockedPerk]
    let missionsCompleted: Int
    let mirrorSessions: Int
    let talkBackAttempts: Int

    enum CodingKeys: String, CodingKey {
        case currentLevel = "current_level"
        case currentXp = "current_xp"
        case totalXp = "total_xp"
        case xpToNextLevel = "xp_to_next_level"
        case levelTitle = "level_title"
        case levelTitleHe = "level_title_he"
        case unlockedPerks = "unlocked_perks"
        case missionsCompleted = "missions_completed"
        case mirrorSessions = "mirror_sessions"
        case talkBackAttempts = "talk_back_attempts"
    }
}
