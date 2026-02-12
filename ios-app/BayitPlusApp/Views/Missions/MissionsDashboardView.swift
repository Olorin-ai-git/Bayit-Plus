import BayitDesignSystem
import BayitLocalization
import SwiftUI

struct MissionsDashboardView: View {
    @Environment(RepositoryProvider.self) private var repos
    @Environment(LocalizationManager.self) private var localization
    @State private var profile: GamificationProfile?
    @State private var isLoading = false
    @State private var error: String?
    @State private var selectedPerk: UnlockedPerk?

    let profileId: String

    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            if isLoading && profile == nil {
                ProgressView().tint(.white)
                    .padding(.top, DesignTokens.Spacing.xxxxl)
            } else if let errorMsg = error, profile == nil {
                ErrorStateView(message: errorMsg) {
                    Task { await load() }
                }
            } else if let profile = profile {
                LazyVStack(spacing: DesignTokens.Spacing.lg) {
                    levelCard(profile)
                    perksSection(profile)
                    activitySection(profile)
                }
                .padding(.vertical, DesignTokens.Spacing.lg)
            }
        }
        .background(DesignTokens.Background.primary)
        .sheet(item: $selectedPerk) { perk in
            PerkUnlockSheet(perk: perk, onClaim: handleClaimPerk)
        }
        .task {
            await load()
        }
    }

    private func levelCard(_ profile: GamificationProfile) -> some View {
        GlassCard {
            VStack(spacing: DesignTokens.Spacing.md) {
                Text("\(profile.currentLevel)")
                    .font(.system(size: 48, weight: .bold))
                    .foregroundStyle(DesignTokens.Text.primary)

                Text(localization.isRTL ? profile.levelTitleHe : profile.levelTitle)
                    .font(.system(size: DesignTokens.FontSize.xl, weight: .semibold))
                    .foregroundStyle(DesignTokens.gold)

                LevelProgressView(
                    currentXp: profile.currentXp,
                    xpToNextLevel: profile.xpToNextLevel,
                    level: profile.currentLevel,
                    title: localization.isRTL ? profile.levelTitleHe : profile.levelTitle
                )
            }
            .padding(.vertical, DesignTokens.Spacing.md)
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    private func perksSection(_ profile: GamificationProfile) -> some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            Text(localization.t("gamification.unlockedPerks"))
                .font(.system(size: DesignTokens.FontSize.md, weight: .semibold))
                .foregroundStyle(DesignTokens.Text.primary)
                .padding(.horizontal, DesignTokens.Spacing.lg)

            if profile.unlockedPerks.isEmpty {
                Text(localization.t("gamification.noPerksYet"))
                    .font(.system(size: DesignTokens.FontSize.base))
                    .foregroundStyle(DesignTokens.Text.muted)
                    .padding(.horizontal, DesignTokens.Spacing.lg)
            } else {
                let columns = [
                    GridItem(.flexible(), spacing: DesignTokens.Spacing.md),
                    GridItem(.flexible(), spacing: DesignTokens.Spacing.md),
                    GridItem(.flexible(), spacing: DesignTokens.Spacing.md)
                ]

                LazyVGrid(columns: columns, spacing: DesignTokens.Spacing.md) {
                    ForEach(profile.unlockedPerks, id: \.perkId) { perk in
                        perkItem(perk)
                    }
                }
                .padding(.horizontal, DesignTokens.Spacing.lg)
            }
        }
    }

    private func perkItem(_ perk: UnlockedPerk) -> some View {
        GlassCard(padding: DesignTokens.Spacing.md) {
            VStack(spacing: DesignTokens.Spacing.sm) {
                Text(perk.perkType == "outfit" ? "👕" : "🎁")
                    .font(.system(size: 32))

                Text(localization.t("gamification.perks.\(perk.perkId)"))
                    .font(.system(size: DesignTokens.FontSize.xs, weight: .semibold))
                    .foregroundStyle(DesignTokens.Text.primary)
                    .multilineTextAlignment(.center)
                    .lineLimit(2)
            }
        }
        .onTapGesture {
            HapticFeedbackService.impact(style: .light)
            selectedPerk = perk
        }
    }

    private func activitySection(_ profile: GamificationProfile) -> some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            Text(localization.t("gamification.activity"))
                .font(.system(size: DesignTokens.FontSize.md, weight: .semibold))
                .foregroundStyle(DesignTokens.Text.primary)
                .padding(.horizontal, DesignTokens.Spacing.lg)

            GlassCard {
                VStack(spacing: 0) {
                    statRow(
                        label: localization.t("gamification.missionsCompleted"),
                        value: "\(profile.missionsCompleted)"
                    )
                    statRow(
                        label: localization.t("gamification.mirrorSessions"),
                        value: "\(profile.mirrorSessions)"
                    )
                    statRow(
                        label: localization.t("gamification.talkBackAttempts"),
                        value: "\(profile.talkBackAttempts)"
                    )
                    statRow(
                        label: localization.t("gamification.totalXP"),
                        value: "\(profile.totalXp)",
                        isLast: true
                    )
                }
            }
            .padding(.horizontal, DesignTokens.Spacing.lg)
        }
    }

    private func statRow(label: String, value: String, isLast: Bool = false) -> some View {
        HStack {
            Text(label)
                .font(.system(size: DesignTokens.FontSize.base))
                .foregroundStyle(DesignTokens.Text.secondary)

            Spacer()

            Text(value)
                .font(.system(size: DesignTokens.FontSize.lg, weight: .semibold))
                .foregroundStyle(DesignTokens.Text.primary)
        }
        .padding(.vertical, DesignTokens.Spacing.sm)
        .overlay(alignment: .bottom) {
            if !isLast {
                Divider()
                    .background(DesignTokens.Glass.border)
            }
        }
    }

    private func load() async {
        isLoading = true
        error = nil

        do {
            let url = URL(string: "\(repos.baseURL)/api/v1/gamification/profile?profile_id=\(profileId)")!
            let (data, _) = try await URLSession.shared.data(from: url)
            profile = try JSONDecoder().decode(GamificationProfile.self, from: data)
        } catch {
            self.error = error.localizedDescription
        }

        isLoading = false
    }

    private func handleClaimPerk(_ perkId: String) {
        Task {
            await load()
        }
    }
}
