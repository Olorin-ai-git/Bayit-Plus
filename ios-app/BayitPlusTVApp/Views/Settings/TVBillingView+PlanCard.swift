import BayitDesignSystem
import BayitLocalization
import SwiftUI

// MARK: - Left Column: Current Plan Card & Right Column

extension TVBillingView {
    // MARK: - Current Plan Card

    var currentPlanCard: some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.lg) {
            planCardHeader
            Divider()
                .background(Color.white.opacity(0.12))
            if let sub = subscription {
                planDetailRow(
                    label: localization.t("billing.plan"),
                    value: sub.plan?.capitalized ?? "-"
                )
                planDetailRow(
                    label: localization.t("billing.status"),
                    value: sub.status?.capitalized ?? "-",
                    valueColor: statusColor(sub.status)
                )
                planDetailRow(
                    label: localization.t("billing.period"),
                    value: sub.billingPeriod?.capitalized ?? "-"
                )
                if let end = sub.currentPeriodEnd {
                    planDetailRow(
                        label: localization.t("billing.renewsOn"),
                        value: end
                    )
                }
                if let price = sub.price {
                    planPrice(price)
                }
            } else {
                Text(localization.t("billing.noSubscription"))
                    .font(.system(size: TVDesignTokens.FontSize.base))
                    .foregroundStyle(DesignTokens.Text.secondary)
            }
        }
        .padding(TVDesignTokens.Spacing.xl)
        .background(DesignTokens.Glass.bgLight)
        .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.xl))
        .overlay(
            RoundedRectangle(cornerRadius: TVDesignTokens.Radius.xl)
                .stroke(
                    LinearGradient(
                        colors: [
                            DesignTokens.Primary.p400.opacity(0.7),
                            DesignTokens.Primary.p400,
                            DesignTokens.Secondary.s400.opacity(0.8),
                        ],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    ),
                    lineWidth: 2
                )
        )
        .shadow(color: DesignTokens.Primary.p400.opacity(0.3), radius: 28)
    }

    private var planCardHeader: some View {
        HStack(spacing: TVDesignTokens.Spacing.md) {
            Image(systemName: "crown.fill")
                .font(.system(size: TVDesignTokens.FontSize.xl))
                .foregroundStyle(
                    LinearGradient(
                        colors: [DesignTokens.Primary.p400, DesignTokens.Secondary.s400],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
                .shadow(color: DesignTokens.Primary.p400.opacity(0.6), radius: 12)
            Text(planDisplayName)
                .font(.system(size: TVDesignTokens.FontSize.xl, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)
            Spacer()
            statusBadgePill(subscription?.status)
        }
    }

    private var planDisplayName: String {
        guard let plan = subscription?.plan else { return "Bayit+" }
        return plan == "free" ? "Bayit+ Basic" : "Bayit+ Premium"
    }

    private func statusBadgePill(_ status: String?) -> some View {
        let color = statusColor(status)
        return Text(status?.capitalized ?? "-")
            .font(.system(size: TVDesignTokens.FontSize.sm, weight: .semibold))
            .foregroundStyle(.white)
            .padding(.horizontal, TVDesignTokens.Spacing.md)
            .padding(.vertical, TVDesignTokens.Spacing.xs)
            .background(color)
            .clipShape(Capsule())
    }

    private func statusColor(_ status: String?) -> Color {
        switch status {
        case "active": return DesignTokens.Success.default
        case "trial": return DesignTokens.Info.default
        case "canceled", "cancelled", "expired": return DesignTokens.ErrorColor.default
        case "paused": return DesignTokens.Warning.default
        default: return DesignTokens.Text.muted
        }
    }

    func planDetailRow(
        label: String,
        value: String,
        valueColor: Color = DesignTokens.Text.primary
    ) -> some View {
        HStack {
            Text(label)
                .font(.system(size: TVDesignTokens.FontSize.sm))
                .foregroundStyle(DesignTokens.Text.secondary)
            Spacer()
            Text(value)
                .font(.system(size: TVDesignTokens.FontSize.sm, weight: .medium))
                .foregroundStyle(valueColor)
        }
    }

    private func planPrice(_ price: String) -> some View {
        HStack(alignment: .lastTextBaseline, spacing: 4) {
            Text(price)
                .font(.system(size: TVDesignTokens.FontSize.display, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)
            Text("/month")
                .font(.system(size: TVDesignTokens.FontSize.lg))
                .foregroundStyle(DesignTokens.Primary.p400)
        }
        .padding(.top, TVDesignTokens.Spacing.sm)
    }

    // MARK: - Right Column

    var rightColumn: some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.xl) {
            paymentMethodCard
            transactionsSection
        }
    }

    // MARK: - Payment Method Card

    private var paymentMethodCard: some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.md) {
            HStack(spacing: TVDesignTokens.Spacing.sm) {
                Image(systemName: "creditcard.fill")
                    .font(.system(size: TVDesignTokens.FontSize.md))
                    .foregroundStyle(DesignTokens.Primary.p400)
                Text(localization.t("billing.paymentMethod"))
                    .font(.system(size: TVDesignTokens.FontSize.md, weight: .semibold))
                    .foregroundStyle(DesignTokens.Text.primary)
            }
            HStack(spacing: TVDesignTokens.Spacing.sm) {
                Image(systemName: "iphone")
                    .font(.system(size: TVDesignTokens.FontSize.base))
                    .foregroundStyle(DesignTokens.Text.muted)
                Text(localization.t("billing.managedVia"))
                    .font(.system(size: TVDesignTokens.FontSize.base))
                    .foregroundStyle(DesignTokens.Text.secondary)
                Text("bayit.tv")
                    .font(.system(size: TVDesignTokens.FontSize.base, weight: .bold))
                    .foregroundStyle(DesignTokens.Primary.p400)
            }
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
}
