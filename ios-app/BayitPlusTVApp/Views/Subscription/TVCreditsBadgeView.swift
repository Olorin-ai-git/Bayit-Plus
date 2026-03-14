#if os(tvOS)

    import BayitAuth
    import BayitDesignSystem
    import BayitLocalization
    import SwiftUI

    /// Compact credit balance badge for the tvOS home screen.
    /// Shows remaining AI credits with progress bar for free users,
    /// or a "Plus Member" badge for subscribers.
    /// Adapted for 10-foot UI with larger fonts and D-pad focus.
    struct TVCreditsBadgeView: View {
        @Environment(TVNavigationCoordinator.self) private var coordinator
        @Environment(LocalizationManager.self) private var localization
        @Environment(TVRepositoryProvider.self) private var repos
        @Environment(AuthManager.self) private var authManager

        @State private var balance: CreditBalance?

        private var isPlus: Bool {
            authManager.user?.subscriptionTier == .plus
        }

        var body: some View {
            Button {
                if !isPlus {
                    coordinator.fullscreenRoute = .subscriptionGate
                }
            } label: {
                content
            }
            .buttonStyle(.card)
            .task {
                await loadBalance()
            }
        }

        @ViewBuilder
        private var content: some View {
            if isPlus {
                plusBadge
            } else if let bal = balance {
                creditBadge(bal)
            }
        }

        private var plusBadge: some View {
            HStack(spacing: TVDesignTokens.Spacing.md) {
                Image(systemName: "crown.fill")
                    .font(.system(size: TVDesignTokens.FontSize.xl))
                    .foregroundStyle(DesignTokens.Warning.default)

                Text(localization.t("plus.badge.subscribedLabel"))
                    .font(.system(size: TVDesignTokens.FontSize.lg, weight: .bold))
                    .foregroundStyle(DesignTokens.Warning.default)

                Spacer()

                Text(localization.t("plus.badge.unlimited"))
                    .font(.system(size: TVDesignTokens.FontSize.md))
                    .foregroundStyle(DesignTokens.Text.muted)
            }
            .padding(TVDesignTokens.Spacing.lg)
            .background(DesignTokens.Glass.bgLight)
            .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md))
        }

        private func creditBadge(_ bal: CreditBalance) -> some View {
            let remaining = bal.remainingCredits ?? 0
            let total = bal.totalCredits ?? 0
            let progress = total > 0 ? Double(remaining) / Double(total) : 0
            let status = creditStatus(
                remaining: remaining, total: total, balance: bal
            )

            return HStack(spacing: TVDesignTokens.Spacing.md) {
                Image(systemName: "sparkles")
                    .font(.system(size: TVDesignTokens.FontSize.xl))
                    .foregroundStyle(status.color)

                VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.xs) {
                    Text(
                        localization.t(
                            "plus.badge.creditsRemaining",
                            ["count": String(remaining)]
                        )
                    )
                    .font(.system(size: TVDesignTokens.FontSize.md, weight: .semibold))
                    .foregroundStyle(DesignTokens.Text.primary)

                    GeometryReader { geo in
                        ZStack(alignment: .leading) {
                            RoundedRectangle(cornerRadius: 3)
                                .fill(Color.white.opacity(0.1))
                                .frame(height: 6)
                            RoundedRectangle(cornerRadius: 3)
                                .fill(status.color)
                                .frame(width: geo.size.width * progress, height: 6)
                        }
                    }
                    .frame(height: 6)
                }

                if status != .healthy {
                    upgradePill
                }
            }
            .padding(TVDesignTokens.Spacing.lg)
            .background(DesignTokens.Glass.bgLight)
            .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md))
        }

        private var upgradePill: some View {
            HStack(spacing: TVDesignTokens.Spacing.xs) {
                Image(systemName: "bolt.fill")
                    .font(.system(size: TVDesignTokens.FontSize.sm))
                    .foregroundStyle(DesignTokens.Primary.p400)
                Text(localization.t("plus.badge.upgradeNow"))
                    .font(.system(size: TVDesignTokens.FontSize.sm, weight: .bold))
                    .foregroundStyle(DesignTokens.Primary.p400)
            }
            .padding(.horizontal, TVDesignTokens.Spacing.md)
            .padding(.vertical, TVDesignTokens.Spacing.sm)
            .background(DesignTokens.Primary.p400.opacity(0.15))
            .clipShape(Capsule())
        }

        private func loadBalance() async {
            do {
                balance = try await repos.betaCredits.fetchBalance()
            } catch {
                // Silent fail - badge simply won't render
            }
        }

        private func creditStatus(
            remaining: Int, total: Int, balance: CreditBalance
        ) -> TVCreditStatusLevel {
            if remaining <= 0 { return .depleted }
            if balance.isCritical == true || balance.isLow == true {
                return .warning
            }
            if total > 0, Double(remaining) / Double(total) < 0.2 {
                return .warning
            }
            return .healthy
        }
    }

    private enum TVCreditStatusLevel: Equatable {
        case healthy, warning, depleted

        var color: Color {
            switch self {
            case .healthy: DesignTokens.Success.default
            case .warning: DesignTokens.Warning.default
            case .depleted: DesignTokens.ErrorColor.default
            }
        }
    }

#endif
