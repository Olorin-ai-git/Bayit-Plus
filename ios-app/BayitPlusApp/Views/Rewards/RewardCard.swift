import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Points header card displaying current points with star icon.
struct RewardPointsHeader: View {
    @Environment(LocalizationManager.self) private var localization
    let points: Int

    var body: some View {
        GlassCard {
            VStack(spacing: DesignTokens.Spacing.md) {
                Image(systemName: "star.fill")
                    .font(.system(size: 36))
                    .foregroundStyle(DesignTokens.gold)

                Text("\(points)")
                    .font(.system(size: DesignTokens.FontSize.hero, weight: .bold))
                    .foregroundStyle(DesignTokens.Text.primary)

                Text(localization.t("rewards.points"))
                    .font(.system(size: DesignTokens.FontSize.sm))
                    .foregroundStyle(DesignTokens.Text.muted)
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }
}

/// Badge item card showing icon and name with tap-to-celebrate.
struct RewardBadgeItem: View {
    let badge: Badge
    let onTap: () -> Void

    var body: some View {
        GlassCard(padding: DesignTokens.Spacing.md) {
            VStack(spacing: DesignTokens.Spacing.sm) {
                Image(systemName: badge.icon ?? "star.circle.fill")
                    .font(.system(size: 32))
                    .foregroundStyle(DesignTokens.gold)

                Text(badge.name ?? "")
                    .font(.system(size: DesignTokens.FontSize.xs, weight: .semibold))
                    .foregroundStyle(DesignTokens.Text.primary)
                    .multilineTextAlignment(.center)
                    .lineLimit(2)
            }
        }
        .onTapGesture {
            HapticFeedbackService.impact(style: .light)
            onTap()
        }
    }
}

/// Full-screen badge celebration overlay.
struct RewardBadgeCelebration: View {
    @Environment(LocalizationManager.self) private var localization
    let badge: Badge
    let onDismiss: () -> Void

    var body: some View {
        ZStack {
            Color.black.opacity(0.75)
                .ignoresSafeArea()
                .onTapGesture { onDismiss() }

            VStack(spacing: DesignTokens.Spacing.lg) {
                Image(systemName: badge.icon ?? "star.circle.fill")
                    .font(.system(size: 64))
                    .foregroundStyle(DesignTokens.gold)
                    .scaleEffect(1.2)

                Text(badge.name ?? "")
                    .font(.system(size: DesignTokens.FontSize.xl, weight: .bold))
                    .foregroundStyle(DesignTokens.Text.primary)

                if let description = badge.description {
                    Text(description)
                        .font(.system(size: DesignTokens.FontSize.base))
                        .foregroundStyle(DesignTokens.Text.secondary)
                        .multilineTextAlignment(.center)
                }

                GlassButton(
                    localization.t("common.dismiss"),
                    variant: .secondary
                ) {
                    onDismiss()
                }
            }
            .glassCard()
            .padding(.horizontal, DesignTokens.Spacing.xl)
        }
        .transition(.opacity.combined(with: .scale(scale: 0.9)))
    }
}
