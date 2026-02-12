#if os(tvOS)
import BayitDesignSystem
import BayitLocalization
import SwiftUI

struct TVMissionsDashboardView: View {
    @Environment(RepositoryProvider.self) private var repos
    @Environment(LocalizationManager.self) private var localization
    @State private var profile: GamificationProfile?
    @State private var isLoading = false
    @State private var error: String?
    @State private var focusedPerk: UnlockedPerk?

    let profileId: String

    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            if isLoading && profile == nil {
                ProgressView().tint(.white)
                    .padding(.top, TVDesignTokens.Spacing.xxxl)
            } else if let errorMsg = error, profile == nil {
                VStack(spacing: TVDesignTokens.Spacing.lg) {
                    Text(errorMsg)
                        .font(.system(size: TVDesignTokens.FontSize.base))
                        .foregroundStyle(TVDesignTokens.Text.primary)

                    Button(localization.t("common.retry")) {
                        Task { await load() }
                    }
                    .buttonStyle(.plain)
                    .padding()
                }
            } else if let profile = profile {
                VStack(spacing: TVDesignTokens.Spacing.xl) {
                    levelCard(profile)
                    perksSection(profile)
                    activitySection(profile)
                }
                .padding(.vertical, TVDesignTokens.Spacing.xl)
                .padding(.horizontal, TVDesignTokens.Spacing.xxl)
            }
        }
        .background(TVDesignTokens.Background.primary)
        .task {
            await load()
        }
    }

    private func levelCard(_ profile: GamificationProfile) -> some View {
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
                            width: geometry.size.width * progressValue(profile),
                            height: 20
                        )
                }
            }
            .frame(height: 20)
            .frame(maxWidth: 800)

            Text(xpProgressText(profile))
                .font(.system(size: TVDesignTokens.FontSize.base))
                .foregroundStyle(TVDesignTokens.Text.muted)
        }
        .padding(TVDesignTokens.Spacing.xl)
        .background(TVDesignTokens.Glass.bgLight)
        .cornerRadius(TVDesignTokens.Radius.lg)
    }

    private func perksSection(_ profile: GamificationProfile) -> some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.md) {
            Text(localization.t("gamification.unlockedPerks"))
                .font(.system(size: TVDesignTokens.FontSize.lg, weight: .semibold))
                .foregroundStyle(TVDesignTokens.Text.primary)

            if profile.unlockedPerks.isEmpty {
                Text(localization.t("gamification.noPerksYet"))
                    .font(.system(size: TVDesignTokens.FontSize.base))
                    .foregroundStyle(TVDesignTokens.Text.muted)
            } else {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: TVDesignTokens.Spacing.lg) {
                        ForEach(profile.unlockedPerks, id: \.perkId) { perk in
                            perkCard(perk)
                        }
                    }
                }
            }
        }
    }

    private func perkCard(_ perk: UnlockedPerk) -> some View {
        VStack(spacing: TVDesignTokens.Spacing.md) {
            Text(perk.perkType == "outfit" ? "👕" : "🎁")
                .font(.system(size: 64))

            Text(localization.t("gamification.perks.\(perk.perkId)"))
                .font(.system(size: TVDesignTokens.FontSize.base, weight: .semibold))
                .foregroundStyle(TVDesignTokens.Text.primary)
                .multilineTextAlignment(.center)
                .lineLimit(2)
        }
        .frame(width: 240, height: 240)
        .background(TVDesignTokens.Glass.bgMedium)
        .cornerRadius(TVDesignTokens.Radius.md)
        .focusable()
    }

    private func activitySection(_ profile: GamificationProfile) -> some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.md) {
            Text(localization.t("gamification.activity"))
                .font(.system(size: TVDesignTokens.FontSize.lg, weight: .semibold))
                .foregroundStyle(TVDesignTokens.Text.primary)

            VStack(spacing: TVDesignTokens.Spacing.sm) {
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
                    value: "\(profile.totalXp)"
                )
            }
            .padding(TVDesignTokens.Spacing.lg)
            .background(TVDesignTokens.Glass.bgLight)
            .cornerRadius(TVDesignTokens.Radius.md)
        }
    }

    private func statRow(label: String, value: String) -> some View {
        HStack {
            Text(label)
                .font(.system(size: TVDesignTokens.FontSize.base))
                .foregroundStyle(TVDesignTokens.Text.secondary)

            Spacer()

            Text(value)
                .font(.system(size: TVDesignTokens.FontSize.lg, weight: .semibold))
                .foregroundStyle(TVDesignTokens.Text.primary)
        }
        .padding(.vertical, TVDesignTokens.Spacing.xs)
    }

    private func progressValue(_ profile: GamificationProfile) -> Double {
        guard profile.xpToNextLevel > 0 else { return 1.0 }
        return Double(profile.currentXp) / Double(profile.xpToNextLevel)
    }

    private func xpProgressText(_ profile: GamificationProfile) -> String {
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
}
#endif
