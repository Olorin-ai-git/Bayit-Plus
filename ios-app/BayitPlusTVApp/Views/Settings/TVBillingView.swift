import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// tvOS billing screen showing current subscription plan and transaction
/// history, adapted for 10-foot UI with focus-based navigation.
struct TVBillingView: View {
    @Environment(LocalizationManager.self) private var localization
    @Environment(TVRepositoryProvider.self) private var repos
    @State private var transactions: [Transaction] = []
    @State private var subscription: SubscriptionDetail?
    @State private var isLoading = false
    @State private var error: String?

    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            LazyVStack(spacing: TVDesignTokens.Spacing.xl) {
                if isLoading {
                    ProgressView()
                        .tint(.white)
                        .padding(.top, TVDesignTokens.Spacing.xxxxl)
                } else if let error {
                    errorContent(error)
                } else {
                    currentPlanCard
                    transactionsSection
                }
            }
            .padding(.vertical, TVDesignTokens.Spacing.xl)
        }
        .background(DesignTokens.Background.primary)
        .task { await load() }
    }

    // MARK: - Load

    @MainActor
    private func load() async {
        isLoading = true
        error = nil
        do {
            async let subResult = repos.settings.fetchCurrentSubscription()
            async let txResult = repos.settings.fetchTransactions(page: 1, limit: 20)
            subscription = try await subResult.subscription
            transactions = try await txResult.items
        } catch {
            self.error = error.localizedDescription
        }
        isLoading = false
    }

    // MARK: - Error

    private func errorContent(_ message: String) -> some View {
        VStack(spacing: TVDesignTokens.Spacing.lg) {
            Image(systemName: "exclamationmark.triangle")
                .font(.system(size: TVDesignTokens.FontSize.xxxl))
                .foregroundStyle(DesignTokens.Warning.default)

            Text(message)
                .font(.system(size: TVDesignTokens.FontSize.base))
                .foregroundStyle(DesignTokens.Text.secondary)
                .multilineTextAlignment(.center)

            GlassButton(localization.t("common.retry"), variant: .primary, size: .medium) {
                Task { await load() }
            }
        }
        .padding(.horizontal, TVDesignTokens.Spacing.xl)
        .padding(.top, TVDesignTokens.Spacing.xxxxl)
    }

    // MARK: - Current Plan

    private var currentPlanCard: some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.lg) {
            HStack(spacing: TVDesignTokens.Spacing.md) {
                Image(systemName: "crown.fill")
                    .font(.system(size: TVDesignTokens.FontSize.lg))
                    .foregroundStyle(DesignTokens.Primary.p400)

                Text(localization.t("billing.currentPlan"))
                    .font(.system(size: TVDesignTokens.FontSize.lg, weight: .bold))
                    .foregroundStyle(DesignTokens.Text.primary)
            }

            if let sub = subscription {
                planDetailRow(
                    label: localization.t("billing.plan"),
                    value: sub.plan?.capitalized ?? "-"
                )
                planDetailRow(
                    label: localization.t("billing.status"),
                    value: sub.status?.capitalized ?? "-"
                )
                planDetailRow(
                    label: localization.t("billing.period"),
                    value: sub.billingPeriod?.capitalized ?? "-"
                )
                if let endDate = sub.currentPeriodEnd {
                    planDetailRow(
                        label: localization.t("billing.renewsOn"),
                        value: endDate
                    )
                }
            } else {
                Text(localization.t("billing.noSubscription"))
                    .font(.system(size: TVDesignTokens.FontSize.base))
                    .foregroundStyle(DesignTokens.Text.secondary)
            }
        }
        .padding(TVDesignTokens.Spacing.xl)
        .background(DesignTokens.Glass.bgLight)
        .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg))
        .padding(.horizontal, TVDesignTokens.Spacing.xl)
    }

    private func planDetailRow(label: String, value: String) -> some View {
        HStack {
            Text(label)
                .font(.system(size: TVDesignTokens.FontSize.sm))
                .foregroundStyle(DesignTokens.Text.secondary)
            Spacer()
            Text(value)
                .font(.system(size: TVDesignTokens.FontSize.sm, weight: .medium))
                .foregroundStyle(DesignTokens.Text.primary)
        }
    }

    // MARK: - Transactions

    private var transactionsSection: some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.md) {
            Text(localization.t("billing.transactions"))
                .font(.system(size: TVDesignTokens.FontSize.sm, weight: .semibold))
                .foregroundStyle(DesignTokens.Text.muted)
                .textCase(.uppercase)
                .padding(.horizontal, TVDesignTokens.Spacing.xl)

            if transactions.isEmpty {
                Text(localization.t("billing.noTransactions"))
                    .font(.system(size: TVDesignTokens.FontSize.base))
                    .foregroundStyle(DesignTokens.Text.secondary)
                    .frame(maxWidth: .infinity)
                    .padding(TVDesignTokens.Spacing.xxl)
                    .background(DesignTokens.Glass.bgLight)
                    .clipShape(RoundedRectangle(cornerRadius: TVDesignTokens.Radius.lg))
                    .padding(.horizontal, TVDesignTokens.Spacing.xl)
            } else {
                ForEach(transactions) { tx in
                    transactionRow(tx)
                }
            }
        }
    }

    private func transactionRow(_ tx: Transaction) -> some View {
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

    private func statusBadge(_ status: String?) -> some View {
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
