import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Extension on RewardsView providing badge collection grid and badge celebration overlay.
extension RewardsView {
    // MARK: - Badge Collection

    func badgeCollection(_ vm: RewardsViewModel) -> some View {
        VStack(spacing: DesignTokens.Spacing.sm) {
            HStack {
                Text(localization.t("rewards.badges"))
                    .font(.system(size: DesignTokens.FontSize.sm, weight: .semibold))
                    .foregroundStyle(DesignTokens.Text.muted)
                    .textCase(.uppercase)
                Spacer()
            }
            .padding(.horizontal, DesignTokens.Spacing.lg)

            if vm.badges.isEmpty {
                GlassCard {
                    VStack(spacing: DesignTokens.Spacing.sm) {
                        Image(systemName: "trophy")
                            .font(.system(size: 32))
                            .foregroundStyle(DesignTokens.Text.muted)
                        Text(localization.t("rewards.noBadges"))
                            .font(.system(size: DesignTokens.FontSize.base))
                            .foregroundStyle(DesignTokens.Text.secondary)
                    }
                    .frame(maxWidth: .infinity)
                }
                .padding(.horizontal, DesignTokens.Spacing.lg)
            } else {
                let columns = [
                    GridItem(.flexible(), spacing: DesignTokens.Spacing.md),
                    GridItem(.flexible(), spacing: DesignTokens.Spacing.md),
                    GridItem(.flexible(), spacing: DesignTokens.Spacing.md),
                ]

                LazyVGrid(columns: columns, spacing: DesignTokens.Spacing.md) {
                    ForEach(vm.badges) { badge in
                        badgeItem(badge)
                    }
                }
                .padding(.horizontal, DesignTokens.Spacing.lg)
            }
        }
    }

    func badgeItem(_ badge: Badge) -> some View {
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
            celebratingBadge = badge
        }
    }

    // MARK: - Badge Celebration

    func badgeCelebration(_ badge: Badge) -> some View {
        ZStack {
            Color.black.opacity(0.75)
                .ignoresSafeArea()
                .onTapGesture {
                    withAnimation { celebratingBadge = nil }
                }

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
                    withAnimation { celebratingBadge = nil }
                }
            }
            .glassCard()
            .padding(.horizontal, DesignTokens.Spacing.xl)
        }
        .transition(.opacity.combined(with: .scale(scale: 0.9)))
        .animation(.spring(duration: 0.4, bounce: 0.2), value: celebratingBadge != nil)
    }
}
