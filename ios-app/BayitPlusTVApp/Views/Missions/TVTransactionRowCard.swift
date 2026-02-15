#if os(tvOS)
import BayitDesignSystem
import BayitLocalization
import SwiftUI

struct TVTransactionRowCard: View {
    @Environment(LocalizationManager.self) private var localization
    let transaction: ShekelsTransaction

    var body: some View {
        HStack(spacing: TVDesignTokens.Spacing.lg) {
            Image(systemName: transactionIcon)
                .font(.system(size: TVDesignTokens.FontSize.xl))
                .foregroundStyle(iconColor)
                .frame(width: 60, height: 60)
                .background(DesignTokens.Glass.bgMedium)
                .clipShape(Circle())

            VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.xs) {
                Text(transaction.description)
                    .font(.system(size: TVDesignTokens.FontSize.base, weight: .semibold))
                    .foregroundStyle(DesignTokens.Text.primary)
                    .lineLimit(1)

                Text(formattedDate)
                    .font(.system(size: TVDesignTokens.FontSize.sm))
                    .foregroundStyle(DesignTokens.Text.muted)
            }

            Spacer()

            Text(formattedAmount)
                .font(.system(size: TVDesignTokens.FontSize.lg, weight: .bold))
                .foregroundStyle(amountColor)
        }
        .padding(TVDesignTokens.Spacing.lg)
        .background(DesignTokens.Glass.bg)
        .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.md))
    }

    private var transactionIcon: String {
        switch transaction.type {
        case .earned:
            return "star.fill"
        case .spent:
            return "cart.fill"
        case .bonus:
            return "gift.fill"
        case .penalty:
            return "exclamationmark.triangle.fill"
        }
    }

    private var iconColor: Color {
        switch transaction.type {
        case .earned:
            return DesignTokens.Success.default
        case .spent:
            return DesignTokens.Primary.default
        case .bonus:
            return DesignTokens.gold
        case .penalty:
            return DesignTokens.ErrorColor.default
        }
    }

    private var amountColor: Color {
        transaction.amount >= 0 ? DesignTokens.Success.default : DesignTokens.ErrorColor.default
    }

    private var formattedAmount: String {
        let prefix = transaction.amount >= 0 ? "+" : ""
        return "\(prefix)\(transaction.amount)"
    }

    private var formattedDate: String {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        formatter.timeStyle = .short
        return formatter.string(from: transaction.createdAt)
    }
}
#endif
