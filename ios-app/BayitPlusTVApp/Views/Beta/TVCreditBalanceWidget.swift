#if os(tvOS)
import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// tvOS compact credit balance widget for embedding in profile or player.
/// Shows remaining credits count and color-coded progress indicator.
struct TVCreditBalanceWidget: View {
    let balance: CreditBalance?

    @Environment(LocalizationManager.self) private var localization

    var body: some View {
        if let balance {
            HStack(spacing: TVDesignTokens.Spacing.md) {
                creditIcon

                VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.xs) {
                    Text(localization.t("beta.credits.title"))
                        .font(.system(size: TVDesignTokens.FontSize.sm, weight: .medium))
                        .foregroundStyle(DesignTokens.Text.secondary)

                    HStack(spacing: TVDesignTokens.Spacing.sm) {
                        Text(String(balance.remainingCredits ?? 0))
                            .font(.system(size: TVDesignTokens.FontSize.lg, weight: .bold))
                            .foregroundStyle(statusColor(for: balance))

                        progressBar(for: balance)
                    }
                }
            }
            .padding(TVDesignTokens.Spacing.md)
            .background(DesignTokens.Glass.bg)
            .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.default))
        }
    }

    private var creditIcon: some View {
        Image(systemName: "sparkles")
            .font(.system(size: TVDesignTokens.FontSize.xl, weight: .semibold))
            .foregroundStyle(DesignTokens.Primary.default)
    }

    private func progressBar(for balance: CreditBalance) -> some View {
        GeometryReader { geo in
            ZStack(alignment: .leading) {
                RoundedRectangle(cornerRadius: TVDesignTokens.Radius.sm)
                    .fill(DesignTokens.Glass.bgStrong)
                    .frame(height: 8)

                RoundedRectangle(cornerRadius: TVDesignTokens.Radius.sm)
                    .fill(statusColor(for: balance))
                    .frame(width: geo.size.width * progressPercentage(for: balance), height: 8)
            }
        }
        .frame(width: 120, height: 8)
    }

    private func statusColor(for balance: CreditBalance) -> Color {
        if balance.isCritical == true {
            return DesignTokens.Colors.Semantic.error
        } else if balance.isLow == true {
            return DesignTokens.Warning.default
        } else {
            return DesignTokens.Colors.Semantic.success
        }
    }

    private func progressPercentage(for balance: CreditBalance) -> Double {
        guard let total = balance.totalCredits, total > 0,
              let remaining = balance.remainingCredits else {
            return 0
        }
        return Double(remaining) / Double(total)
    }
}
#endif
