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
                        .foregroundStyle(DesignTokens.Colors.Text.primary)

                    Button(localization.t("common.retry")) {
                        Task { await load() }
                    }
                    .buttonStyle(.plain)
                    .padding()
                }
            } else if let profile = profile {
                VStack(spacing: TVDesignTokens.Spacing.xl) {
                    TVMissionLevelCardView(profile: profile)
                    TVMissionPerksView(perks: profile.unlockedPerks)
                    activitySection(profile)
                }
                .padding(.vertical, TVDesignTokens.Spacing.xl)
                .padding(.horizontal, TVDesignTokens.Spacing.xxl)
            }
        }
        .background(DesignTokens.Colors.Background.primary)
        .task {
            await load()
        }
    }

    private func activitySection(_ profile: GamificationProfile) -> some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.md) {
            Text(localization.t("gamification.activity"))
                .font(.system(size: TVDesignTokens.FontSize.lg, weight: .semibold))
                .foregroundStyle(DesignTokens.Colors.Text.primary)

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
            .background(DesignTokens.Colors.Glass.backgroundLight)
            .cornerRadius(TVDesignTokens.Radius.md)
        }
    }

    private func statRow(label: String, value: String) -> some View {
        HStack {
            Text(label)
                .font(.system(size: TVDesignTokens.FontSize.base))
                .foregroundStyle(DesignTokens.Colors.Text.secondary)

            Spacer()

            Text(value)
                .font(.system(size: TVDesignTokens.FontSize.lg, weight: .semibold))
                .foregroundStyle(DesignTokens.Colors.Text.primary)
        }
        .padding(.vertical, TVDesignTokens.Spacing.xs)
    }

    private func load() async {
        isLoading = true
        error = nil

        do {
            profile = try await repos.gamificationRepository.fetchProfile(profileId: profileId)
        } catch {
            self.error = error.localizedDescription
        }

        isLoading = false
    }
}
#endif
