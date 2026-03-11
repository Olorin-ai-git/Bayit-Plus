import BayitAuth
import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Compact credit balance badge for the home screen.
/// Shows remaining AI credits with progress bar for free users,
/// or a "Plus Member" badge for subscribers.
struct CreditsBadgeView: View {
    @Environment(NavigationCoordinator.self) private var coordinator
    @Environment(LocalizationManager.self) private var localization
    @Environment(RepositoryProvider.self) private var repos
    @Environment(AuthManager.self) private var authManager

    @State private var balance: CreditBalance?

    private var isPlus: Bool {
        authManager.user?.subscriptionTier == .plus
    }

    var body: some View {
        Button {
            if !isPlus {
                coordinator.navigate(to: .subscription)
            }
        } label: {
            content
        }
        .buttonStyle(.plain)
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
        HStack(spacing: DesignTokens.Spacing.sm) {
            Image(systemName: "crown.fill")
                .font(.system(size: 18))
                .foregroundStyle(DesignTokens.Warning.default)

            Text(localization.t("plus.badge.subscribedLabel"))
                .font(.system(size: DesignTokens.FontSize.sm, weight: .bold))
                .foregroundStyle(DesignTokens.Warning.default)

            Spacer()

            Text(localization.t("plus.badge.unlimited"))
                .font(.system(size: DesignTokens.FontSize.sm))
                .foregroundStyle(DesignTokens.Text.muted)
        }
        .padding(DesignTokens.Spacing.md)
        .glassCard(radius: DesignTokens.Radius.md, padding: 0)
    }

    private func creditBadge(_ bal: CreditBalance) -> some View {
        let remaining = bal.remainingCredits ?? 0
        let total = bal.totalCredits ?? 0
        let progress = total > 0 ? Double(remaining) / Double(total) : 0
        let status = creditStatus(remaining: remaining, total: total, balance: bal)

        return HStack(spacing: DesignTokens.Spacing.sm) {
            Image(systemName: "sparkles")
                .font(.system(size: 18))
                .foregroundStyle(status.color)

            VStack(alignment: .leading, spacing: 4) {
                Text(String(format: localization.t("plus.badge.creditsRemaining"), remaining))
                    .font(.system(size: DesignTokens.FontSize.sm, weight: .semibold))
                    .foregroundStyle(DesignTokens.Text.primary)

                GeometryReader { geo in
                    ZStack(alignment: .leading) {
                        RoundedRectangle(cornerRadius: 2)
                            .fill(Color.white.opacity(0.1))
                            .frame(height: 4)
                        RoundedRectangle(cornerRadius: 2)
                            .fill(status.color)
                            .frame(width: geo.size.width * progress, height: 4)
                    }
                }
                .frame(height: 4)
            }

            if status != .healthy {
                upgradePill
            }
        }
        .padding(DesignTokens.Spacing.md)
        .glassCard(radius: DesignTokens.Radius.md, padding: 0)
    }

    private var upgradePill: some View {
        HStack(spacing: 4) {
            Image(systemName: "bolt.fill")
                .font(.system(size: 12))
                .foregroundStyle(DesignTokens.Primary.p400)
            Text(localization.t("plus.badge.upgradeNow"))
                .font(.system(size: DesignTokens.FontSize.xs, weight: .bold))
                .foregroundStyle(DesignTokens.Primary.p400)
        }
        .padding(.horizontal, DesignTokens.Spacing.sm)
        .padding(.vertical, DesignTokens.Spacing.xs)
        .background(DesignTokens.Primary.p400.opacity(0.15))
        .cornerRadius(12)
    }

    private func loadBalance() async {
        do {
            balance = try await repos.betaCredits.fetchBalance()
        } catch {
            // Silent fail - badge just won't show
        }
    }

    private func creditStatus(
        remaining: Int, total: Int, balance: CreditBalance
    ) -> CreditStatusLevel {
        if remaining <= 0 { return .depleted }
        if balance.isCritical == true || balance.isLow == true { return .warning }
        if total > 0 && Double(remaining) / Double(total) < 0.2 { return .warning }
        return .healthy
    }
}

private enum CreditStatusLevel: Equatable {
    case healthy, warning, depleted

    var color: Color {
        switch self {
        case .healthy: DesignTokens.Success.default
        case .warning: DesignTokens.Warning.default
        case .depleted: DesignTokens.ErrorColor.default
        }
    }
}
