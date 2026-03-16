import BayitDesignSystem
import BayitLocalization
import SwiftUI

// MARK: - Transactions Section

extension TVBillingView {
    var transactionsSection: some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.md) {
            Text(localization.t("billing.transactions"))
                .font(.system(
                    size: TVDesignTokens.FontSize.sm, weight: .semibold
                ))
                .foregroundStyle(DesignTokens.Text.muted)
                .textCase(.uppercase)

            if transactions.isEmpty {
                emptyTransactions
            } else {
                VStack(spacing: TVDesignTokens.Spacing.xs) {
                    ForEach(transactions) { tx in
                        transactionRow(tx)
                    }
                }
            }
        }
    }

    private var emptyTransactions: some View {
        HStack(spacing: TVDesignTokens.Spacing.md) {
            Image(systemName: "doc.text")
                .font(.system(size: TVDesignTokens.FontSize.lg))
                .foregroundStyle(DesignTokens.Text.muted)
            Text(localization.t("billing.noTransactions"))
                .font(.system(size: TVDesignTokens.FontSize.base))
                .foregroundStyle(DesignTokens.Text.secondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(TVDesignTokens.Spacing.xl)
        .background(DesignTokens.Glass.bgLight)
        .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.xl))
        .overlay(
            RoundedRectangle(cornerRadius: TVDesignTokens.Radius.xl)
                .stroke(Color.white.opacity(0.1), lineWidth: 1)
        )
    }

    func transactionRow(_ tx: Transaction) -> some View {
        HStack(spacing: TVDesignTokens.Spacing.md) {
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
                .font(.system(
                    size: TVDesignTokens.FontSize.base, weight: .semibold
                ))
                .foregroundStyle(DesignTokens.Text.primary)
            statusBadge(tx.status)
        }
        .padding(TVDesignTokens.Spacing.lg)
        .background(DesignTokens.Glass.bgLight)
        .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg))
        .overlay(
            RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg)
                .stroke(Color.white.opacity(0.08), lineWidth: 1)
        )
    }

    func statusBadge(_ status: String?) -> some View {
        let color: Color = switch status {
        case "completed", "paid": DesignTokens.Success.default
        case "pending": DesignTokens.Warning.default
        case "failed", "refunded": DesignTokens.ErrorColor.default
        default: DesignTokens.Primary.default
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
