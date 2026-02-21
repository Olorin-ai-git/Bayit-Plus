import BayitDesignSystem
import BayitLocalization
import SwiftUI

// MARK: - Transaction Row & Status Badge

extension TVBillingView {
    func transactionRow(_ tx: Transaction) -> some View {
        HStack {
            VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.xxs) {
                Text(tx.description ?? localization.t("billing.payment"))
                    .font(.system(size: TVDesignTokens.FontSize.base))
                    .foregroundStyle(DesignTokens.Text.primary)
                    .lineLimit(1)

                Text(tx.createdAt ?? "")
                    .font(.system(size: TVDesignTokens.FontSize.xs))
                    .foregroundStyle(DesignTokens.Text.muted)
            }

            Spacer()

            Text(String(format: "$%.2f", tx.amount ?? 0))
                .font(.system(size: TVDesignTokens.FontSize.base, weight: .semibold))
                .foregroundStyle(DesignTokens.Text.primary)

            statusBadge(tx.status)
        }
        .padding(TVDesignTokens.Spacing.lg)
        .background(DesignTokens.Glass.bgLight)
        .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg))
        .padding(.horizontal, TVDesignTokens.Spacing.xl)
    }

    func statusBadge(_ status: String?) -> some View {
        let color: Color = switch status {
        case "completed", "paid":
            DesignTokens.Success.default
        case "pending":
            DesignTokens.Warning.default
        case "failed", "refunded":
            DesignTokens.ErrorColor.default
        default:
            DesignTokens.Primary.default
        }
        return Text(status?.capitalized ?? "-")
            .font(.system(size: TVDesignTokens.FontSize.xs, weight: .semibold))
            .foregroundStyle(.white)
            .padding(.horizontal, TVDesignTokens.Spacing.md)
            .padding(.vertical, TVDesignTokens.Spacing.xs)
            .background(color)
            .clipShape(Capsule())
    }
}
