import BayitDesignSystem
import BayitLocalization
import SwiftUI

struct MissionProgressCard: View {
    @Environment(LocalizationManager.self) private var localization

    let mission: DailyMission
    let isClaiming: Bool
    let onClaim: () -> Void

    var body: some View {
        GlassCard {
            HStack(alignment: .top, spacing: DesignTokens.Spacing.md) {
                iconView
                contentStack
                rewardBadge
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    private var iconView: some View {
        ZStack {
            Circle()
                .fill(DesignTokens.Glass.bgMedium)
                .frame(width: 48, height: 48)

            Image(systemName: mission.iconName)
                .font(.system(size: 20))
                .foregroundStyle(
                    mission.isCompleted
                        ? DesignTokens.Success.default
                        : DesignTokens.Primary.p400
                )
        }
    }

    private var contentStack: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            Text(mission.title)
                .font(.system(size: DesignTokens.FontSize.md, weight: .semibold))
                .foregroundStyle(DesignTokens.Text.primary)

            Text(mission.description)
                .font(.system(size: DesignTokens.FontSize.sm))
                .foregroundStyle(DesignTokens.Text.secondary)
                .lineLimit(2)

            progressView

            if mission.isCompleted && !mission.isClaimed {
                claimButton
            } else if mission.isClaimed {
                claimedIndicator
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private var progressView: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
            HStack {
                Text(localization.t("missions.progress"))
                    .font(.system(size: DesignTokens.FontSize.xs))
                    .foregroundStyle(DesignTokens.Text.muted)

                Spacer()

                Text("\(mission.currentValue) / \(mission.targetValue)")
                    .font(.system(size: DesignTokens.FontSize.xs, weight: .medium))
                    .foregroundStyle(DesignTokens.Text.secondary)
            }

            GeometryReader { geometry in
                ZStack(alignment: .leading) {
                    RoundedRectangle(cornerRadius: DesignTokens.Radius.xs)
                        .fill(DesignTokens.Glass.bgMedium)
                        .frame(height: 6)

                    RoundedRectangle(cornerRadius: DesignTokens.Radius.xs)
                        .fill(progressGradient)
                        .frame(
                            width: geometry.size.width * progressPercentage,
                            height: 6
                        )
                }
            }
            .frame(height: 6)
        }
    }

    private var claimButton: some View {
        GlassButton(
            localization.t("missions.claim"),
            variant: .primary,
            size: .small,
            isLoading: isClaiming
        ) {
            #if os(iOS)
            HapticFeedbackService.notification(type: .success)
            #endif
            onClaim()
        }
        .frame(maxWidth: .infinity)
    }

    private var claimedIndicator: some View {
        HStack(spacing: DesignTokens.Spacing.xs) {
            Image(systemName: "checkmark.circle.fill")
                .font(.system(size: DesignTokens.FontSize.sm))
                .foregroundStyle(DesignTokens.Success.default)

            Text(localization.t("missions.claimed"))
                .font(.system(size: DesignTokens.FontSize.sm, weight: .medium))
                .foregroundStyle(DesignTokens.Success.default)
        }
    }

    private var rewardBadge: some View {
        VStack(spacing: DesignTokens.Spacing.xs) {
            Image(systemName: "circlebadge.fill")
                .font(.system(size: 16))
                .foregroundStyle(DesignTokens.Warning.default)

            Text("\(mission.rewardShekels)")
                .font(.system(size: DesignTokens.FontSize.xs, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)
        }
        .padding(DesignTokens.Spacing.sm)
        .background(DesignTokens.Glass.bgLight)
        .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.sm))
    }

    private var progressPercentage: Double {
        guard mission.targetValue > 0 else { return 0 }
        return min(Double(mission.currentValue) / Double(mission.targetValue), 1.0)
    }

    private var progressGradient: LinearGradient {
        LinearGradient(
            colors: mission.isCompleted
                ? [DesignTokens.Success.s400, DesignTokens.Success.default]
                : [DesignTokens.Primary.p400, DesignTokens.Primary.default],
            startPoint: .leading,
            endPoint: .trailing
        )
    }
}
