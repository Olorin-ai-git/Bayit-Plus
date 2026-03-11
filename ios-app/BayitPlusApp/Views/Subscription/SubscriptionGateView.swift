import BayitDesignSystem
import BayitLocalization
import StoreKit
import SwiftUI

/// Subscription gate shown when content requires Plus tier.
/// Uses native StoreKit 2 for in-app purchases.
struct SubscriptionGateView: View {
    @Environment(RepositoryProvider.self) private var repos
    @Environment(LocalizationManager.self) private var localization
    @State private var viewModel: SubscriptionGateViewModel?

    let contentId: String
    let requiredTier: String

    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            if let vm = viewModel {
                LazyVStack(spacing: DesignTokens.Spacing.lg) {
                    if vm.isLoading && !vm.hasProducts {
                        ProgressView().tint(.white)
                            .padding(.top, DesignTokens.Spacing.xxxxl)
                    } else if let error = vm.error, !vm.hasProducts {
                        ErrorStateView(message: error) {
                            Task { await vm.load() }
                        }
                    } else {
                        lockHeader
                        trialBanner
                        billingPicker(vm)
                        purchaseCard(vm)
                    }
                }
                .padding(.vertical, DesignTokens.Spacing.lg)
            }
        }
        .background(DesignTokens.Background.primary)
        .task {
            if viewModel == nil {
                viewModel = SubscriptionGateViewModel(
                    storeManager: repos.storeManager,
                    localization: localization,
                    contentId: contentId,
                    requiredTier: requiredTier
                )
            }
            await viewModel?.load()
        }
    }

    // MARK: - Lock Header

    private var lockHeader: some View {
        VStack(spacing: DesignTokens.Spacing.md) {
            Image(systemName: "lock.fill")
                .font(.system(size: DesignTokens.FontSize.hero))
                .foregroundStyle(DesignTokens.Primary.p400)

            Text(localization.t("gate.contentLocked"))
                .font(.system(
                    size: DesignTokens.FontSize.xl, weight: .bold
                ))
                .foregroundStyle(DesignTokens.Text.primary)

            Text(localization.t("gate.upgradeRequired"))
                .font(.system(size: DesignTokens.FontSize.sm))
                .foregroundStyle(DesignTokens.Text.secondary)
                .multilineTextAlignment(.center)
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    // MARK: - Trial Banner

    private var trialBanner: some View {
        GlassCard {
            HStack(spacing: DesignTokens.Spacing.md) {
                Image(systemName: "gift.fill")
                    .font(.system(size: DesignTokens.FontSize.xl))
                    .foregroundStyle(DesignTokens.Primary.p300)

                VStack(alignment: .leading, spacing: DesignTokens.Spacing.xxs) {
                    Text(localization.t("gate.trialTitle"))
                        .font(.system(
                            size: DesignTokens.FontSize.md,
                            weight: .bold
                        ))
                        .foregroundStyle(DesignTokens.Text.primary)

                    Text(localization.t("gate.trialSubtitle"))
                        .font(.system(size: DesignTokens.FontSize.sm))
                        .foregroundStyle(DesignTokens.Text.secondary)
                }

                Spacer()
            }
        }
        .overlay(
            RoundedRectangle(cornerRadius: DesignTokens.Radius.lg)
                .stroke(
                    LinearGradient(
                        colors: [
                            DesignTokens.Primary.p500,
                            DesignTokens.Secondary.s500,
                        ],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    ),
                    lineWidth: 2
                )
        )
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    // MARK: - Billing Picker

    private func billingPicker(
        _ vm: SubscriptionGateViewModel
    ) -> some View {
        HStack(spacing: 0) {
            ForEach(BillingPeriod.allCases, id: \.rawValue) { period in
                let isSelected = vm.selectedBillingPeriod == period
                Button {
                    vm.selectedBillingPeriod = period
                } label: {
                    Text(period == .monthly
                        ? localization.t("subscription.monthly")
                        : localization.t("subscription.yearly"))
                        .font(.system(
                            size: DesignTokens.FontSize.sm,
                            weight: .semibold
                        ))
                        .foregroundStyle(
                            isSelected
                                ? DesignTokens.Text.primary
                                : DesignTokens.Text.muted
                        )
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, DesignTokens.Spacing.sm)
                        .background(
                            isSelected
                                ? DesignTokens.Glass.bgMedium
                                : Color.clear
                        )
                        .clipShape(
                            RoundedRectangle(
                                cornerRadius: DesignTokens.Radius.md
                            )
                        )
                }
            }
        }
        .glassCard(
            radius: DesignTokens.Radius.md,
            padding: DesignTokens.Spacing.xs
        )
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    // MARK: - Purchase Card

    private func purchaseCard(
        _ vm: SubscriptionGateViewModel
    ) -> some View {
        let product = vm.selectedProduct
        return GlassCard {
            VStack(spacing: DesignTokens.Spacing.md) {
                if let product {
                    Text(product.displayPrice)
                        .font(.system(
                            size: DesignTokens.FontSize.hero,
                            weight: .bold
                        ))
                        .foregroundStyle(DesignTokens.Primary.default)
                }

                GlassButton(
                    localization.t("gate.startTrial"),
                    variant: .primary,
                    isLoading: vm.isProcessing
                ) {
                    Task {
                        guard !vm.isProcessing else { return }
                        HapticFeedbackService.impact(style: .medium)
                        _ = await vm.purchase()
                    }
                }
                .disabled(vm.isProcessing || product == nil)
            }
            .padding(DesignTokens.Spacing.lg)
        }
        .overlay(
            RoundedRectangle(cornerRadius: DesignTokens.Radius.lg)
                .stroke(DesignTokens.Primary.default, lineWidth: 2)
        )
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }
}
