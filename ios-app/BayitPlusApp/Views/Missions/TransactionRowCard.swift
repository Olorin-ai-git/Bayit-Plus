import BayitDesignSystem
import SwiftUI

struct TransactionRowCard: View {
    let transaction: ShekelsTransaction

    var body: some View {
        GlassCard {
            HStack(spacing: DesignTokens.Spacing.md) {
                transactionIcon

                VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
                    Text(transaction.description)
                        .font(.system(size: DesignTokens.FontSize.sm, weight: .medium))
                        .foregroundStyle(DesignTokens.Text.primary)

                    Text(formatDate(transaction.createdAt))
                        .font(.system(size: DesignTokens.FontSize.xs))
                        .foregroundStyle(DesignTokens.Text.muted)
                }

                Spacer()

                Text(formatAmount(transaction.amount, type: transaction.type))
                    .font(.system(size: DesignTokens.FontSize.md, weight: .bold))
                    .foregroundStyle(amountColor(transaction.type))
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    private var transactionIcon: some View {
        let (iconName, bgColor) = iconConfig(for: transaction.type)

        return ZStack {
            Circle()
                .fill(bgColor)
                .frame(width: 36, height: 36)

            Image(systemName: iconName)
                .font(.system(size: 14))
                .foregroundStyle(DesignTokens.Text.primary)
        }
    }

    private func iconConfig(
        for type: ShekelsTransaction.TransactionType
    ) -> (String, Color) {
        switch type {
        case .earned: return ("plus.circle.fill", DesignTokens.Success.default)
        case .spent: return ("minus.circle.fill", DesignTokens.ErrorColor.default)
        case .bonus: return ("gift.fill", DesignTokens.Warning.default)
        case .penalty: return ("exclamationmark.triangle.fill", DesignTokens.ErrorColor.default)
        }
    }

    private func formatAmount(
        _ amount: Int,
        type: ShekelsTransaction.TransactionType
    ) -> String {
        switch type {
        case .earned, .bonus:
            return "+\(amount)"
        case .spent, .penalty:
            return "-\(amount)"
        }
    }

    private func amountColor(_ type: ShekelsTransaction.TransactionType) -> Color {
        switch type {
        case .earned, .bonus:
            return DesignTokens.Success.default
        case .spent, .penalty:
            return DesignTokens.ErrorColor.default
        }
    }

    private func formatDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        formatter.timeStyle = .short
        return formatter.string(from: date)
    }
}
