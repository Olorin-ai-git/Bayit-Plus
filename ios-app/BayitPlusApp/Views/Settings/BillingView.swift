import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Billing screen showing current plan and transaction history.
struct BillingView: View {
    @Environment(RepositoryProvider.self) private var repos
    @Environment(LocalizationManager.self) private var localization
    @State private var transactions: [Transaction] = []
    @State private var subscription: SubscriptionDetail?
    @State private var isLoading = false
    @State private var error: String?

    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            LazyVStack(spacing: DesignTokens.Spacing.lg) {
                if isLoading {
                    ProgressView().tint(.white).padding(.top, DesignTokens.Spacing.xxxxl)
                } else if let error {
                    ErrorStateView(message: error) { Task { await load() } }
                } else {
                    currentPlanCard
                    transactionsSection
                }
            }
            .padding(.vertical, DesignTokens.Spacing.lg)
        }
        .background(DesignTokens.Background.primary)
        .task { await load() }
    }

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

    // MARK: - Current Plan

    private var currentPlanCard: some View {
        GlassCard {
            VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
                HStack {
                    Image(systemName: "crown.fill")
                        .font(.system(size: 24))
                        .foregroundStyle(DesignTokens.Primary.p400)

                    Text(localization.t("billing.currentPlan"))
                        .font(.system(size: DesignTokens.FontSize.lg, weight: .bold))
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
                        .font(.system(size: DesignTokens.FontSize.md))
                        .foregroundStyle(DesignTokens.Text.secondary)
                }
            }
            .padding(DesignTokens.Spacing.lg)
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    private func planDetailRow(label: String, value: String) -> some View {
        HStack {
            Text(label)
                .font(.system(size: DesignTokens.FontSize.sm))
                .foregroundStyle(DesignTokens.Text.secondary)
            Spacer()
            Text(value)
                .font(.system(size: DesignTokens.FontSize.sm, weight: .medium))
                .foregroundStyle(DesignTokens.Text.primary)
        }
    }

    // MARK: - Transactions

    private var transactionsSection: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            Text(localization.t("billing.transactions"))
                .font(.system(size: DesignTokens.FontSize.sm, weight: .semibold))
                .foregroundStyle(DesignTokens.Text.muted)
                .textCase(.uppercase)
                .padding(.horizontal, DesignTokens.Spacing.lg)

            if transactions.isEmpty {
                GlassCard {
                    Text(localization.t("billing.noTransactions"))
                        .font(.system(size: DesignTokens.FontSize.md))
                        .foregroundStyle(DesignTokens.Text.secondary)
                        .frame(maxWidth: .infinity)
                        .padding(DesignTokens.Spacing.xl)
                }
                .padding(.horizontal, DesignTokens.Spacing.lg)
            } else {
                ForEach(transactions) { tx in
                    transactionRow(tx)
                }
            }
        }
    }

    private func transactionRow(_ tx: Transaction) -> some View {
        GlassCard {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text(tx.description ?? localization.t("billing.payment"))
                        .font(.system(size: DesignTokens.FontSize.md))
                        .foregroundStyle(DesignTokens.Text.primary)
                        .lineLimit(1)

                    Text(tx.createdAt ?? "")
                        .font(.system(size: DesignTokens.FontSize.xs))
                        .foregroundStyle(DesignTokens.Text.muted)
                }

                Spacer()

                Text(String(format: "$%.2f", tx.amount ?? 0))
                    .font(.system(size: DesignTokens.FontSize.md, weight: .semibold))
                    .foregroundStyle(DesignTokens.Text.primary)

                statusBadge(tx.status)
            }
            .padding(DesignTokens.Spacing.md)
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    private func statusBadge(_ status: String?) -> some View {
        let variant: GlassBadge.Variant = switch status {
        case "completed", "paid": .success
        case "pending": .warning
        case "failed", "refunded": .error
        default: .info
        }
        return GlassBadge(text: status?.capitalized ?? "-", variant: variant)
    }
}
