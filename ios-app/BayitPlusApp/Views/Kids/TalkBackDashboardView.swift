import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Parent dashboard displaying Talk Back engagement metrics per child profile.
/// Shows response rate, accuracy, shekels earned, and recent attempt history.
struct TalkBackDashboardView: View {
    @Environment(RepositoryProvider.self) private var repos
    @Environment(LocalizationManager.self) private var localization
    @State private var viewModel: TalkBackViewModel?
    let profileId: String

    var body: some View {
        ScrollView {
            VStack(spacing: DesignTokens.Spacing.lg) {
                if let vm = viewModel {
                    if let stats = vm.stats {
                        statsGrid(stats)
                        if !vm.recentAttempts.isEmpty {
                            historySection(vm.recentAttempts)
                        }
                    } else if vm.isLoading {
                        loadingState
                    }
                }
            }
            .padding(DesignTokens.Spacing.base)
        }
        .background(DesignTokens.Background.primary)
        .task {
            if viewModel == nil {
                viewModel = TalkBackViewModel(repository: repos.talkBack)
            }
            await viewModel?.fetchStats(profileId: profileId)
            await viewModel?.fetchHistory(profileId: profileId)
        }
    }

    // MARK: - Loading

    private var loadingState: some View {
        GlassCard {
            ProgressView()
                .tint(DesignTokens.Text.secondary)
                .frame(maxWidth: .infinity, minHeight: 100)
        }
    }

    // MARK: - Stats Grid

    private func statsGrid(_ stats: TalkBackStats) -> some View {
        LazyVGrid(
            columns: [
                GridItem(.flexible(), spacing: DesignTokens.Spacing.sm),
                GridItem(.flexible(), spacing: DesignTokens.Spacing.sm),
            ],
            spacing: DesignTokens.Spacing.sm
        ) {
            statCard(
                value: "\(stats.totalAttempts)",
                label: localization.t("talkBack.dashboard.attempts"),
                color: DesignTokens.Text.primary
            )
            statCard(
                value: "\(Int(stats.hebrewResponseRate * 100))%",
                label: localization.t("talkBack.dashboard.hebrewRate"),
                color: DesignTokens.Success.default
            )
            statCard(
                value: "\(Int(stats.averageAccuracy * 100))%",
                label: localization.t("talkBack.dashboard.accuracy"),
                color: DesignTokens.Info.default
            )
            statCard(
                value: "\(stats.totalShekelsEarned)",
                label: localization.t("talkBack.dashboard.shekels"),
                color: DesignTokens.Warning.default
            )
        }
    }

    private func statCard(value: String, label: String, color: Color) -> some View {
        GlassCard {
            VStack(spacing: DesignTokens.Spacing.xs) {
                Text(value)
                    .font(.system(size: DesignTokens.FontSize.xxl, weight: .bold))
                    .foregroundStyle(color)
                Text(label)
                    .font(.system(size: DesignTokens.FontSize.xs))
                    .foregroundStyle(DesignTokens.Text.secondary)
                    .multilineTextAlignment(.center)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, DesignTokens.Spacing.sm)
        }
    }

    // MARK: - History

    private func historySection(_ attempts: [TalkBackAttemptRecord]) -> some View {
        GlassCard {
            VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
                Text(localization.t("talkBack.dashboard.recentAttempts"))
                    .font(.system(size: DesignTokens.FontSize.base, weight: .semibold))
                    .foregroundStyle(DesignTokens.Text.primary)

                ForEach(attempts.prefix(15)) { attempt in
                    attemptRow(attempt)
                }
            }
        }
    }

    private func attemptRow(_ attempt: TalkBackAttemptRecord) -> some View {
        HStack(spacing: DesignTokens.Spacing.sm) {
            Circle()
                .fill(qualityColor(attempt.quality))
                .frame(width: 8, height: 8)

            VStack(alignment: .leading, spacing: 2) {
                Text(attempt.quality.replacingOccurrences(of: "_", with: " "))
                    .font(.system(size: DesignTokens.FontSize.sm, weight: .medium))
                    .foregroundStyle(DesignTokens.Text.primary)
                    .textCase(.uppercase)

                Text("\(Int(attempt.accuracyScore * 100))% | +\(attempt.shekelsEarned)")
                    .font(.system(size: DesignTokens.FontSize.xs))
                    .foregroundStyle(DesignTokens.Text.muted)
            }

            Spacer()

            Text(attempt.detectedLanguage.uppercased())
                .font(.system(size: DesignTokens.FontSize.xs, weight: .medium))
                .foregroundStyle(DesignTokens.Text.secondary)
        }
        .padding(.vertical, 2)
    }

    // MARK: - Helpers

    private func qualityColor(_ quality: String) -> Color {
        switch quality {
        case "exact_match": return DesignTokens.Success.default
        case "correct_root": return DesignTokens.Info.default
        case "close_phonetic": return DesignTokens.Warning.default
        case "right_language": return DesignTokens.Primary.default
        case "wrong_language": return DesignTokens.ErrorColor.default
        default: return DesignTokens.Text.muted
        }
    }
}
