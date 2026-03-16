import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// tvOS billing screen — two-column layout matching the Bayit+ design language.
/// Left: current subscription plan card. Right: payment method + transaction history.
/// Transactions endpoint absence (404) is handled gracefully with an inline empty state.
struct TVBillingView: View {
    @Environment(LocalizationManager.self) var localization
    @Environment(TVRepositoryProvider.self) private var repos
    @State var subscription: SubscriptionDetail?
    @State var transactions: [Transaction] = []
    @State var isLoading = false
    @State var subscriptionError: String?

    var body: some View {
        ZStack {
            DesignTokens.Background.primary.ignoresSafeArea()
            if isLoading {
                ProgressView()
                    .tint(.white)
                    .scaleEffect(1.6)
            } else if let error = subscriptionError {
                errorContent(error)
            } else {
                ScrollView(.vertical, showsIndicators: false) {
                    VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.xl) {
                        pageHeader
                        columns
                    }
                    .padding(.horizontal, TVDesignTokens.Spacing.xxxl)
                    .padding(.vertical, TVDesignTokens.Spacing.xl)
                }
            }
        }
        .task { await load() }
    }

    // MARK: - Page Header

    private var pageHeader: some View {
        VStack(alignment: .leading, spacing: TVDesignTokens.Spacing.xs) {
            Text(localization.t("billing.title"))
                .font(.system(size: TVDesignTokens.FontSize.xxxl, weight: .bold))
                .foregroundStyle(DesignTokens.Text.primary)
            Text(localization.t("billing.subtitle"))
                .font(.system(size: TVDesignTokens.FontSize.base))
                .foregroundStyle(DesignTokens.Text.secondary)
        }
    }

    // MARK: - Two-Column Layout

    private var columns: some View {
        HStack(alignment: .top, spacing: TVDesignTokens.Spacing.xl) {
            currentPlanCard
                .frame(maxWidth: .infinity)
            rightColumn
                .frame(maxWidth: .infinity)
        }
    }

    // MARK: - Load

    @MainActor
    private func load() async {
        isLoading = true
        subscriptionError = nil
        do {
            subscription = try await repos.settings.fetchCurrentSubscription().subscription
        } catch {
            subscriptionError = error.localizedDescription
        }
        // Transactions endpoint may not exist for regular users — 404 is acceptable.
        if let txResult = try? await repos.settings.fetchTransactions(page: 1, limit: 20) {
            transactions = txResult.items
        }
        isLoading = false
    }

    // MARK: - Error State

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
}
