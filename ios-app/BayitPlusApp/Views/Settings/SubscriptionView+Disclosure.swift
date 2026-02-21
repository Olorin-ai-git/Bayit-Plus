import BayitDesignSystem
import BayitLocalization
import SwiftUI
import UIKit

// MARK: - External Payment Disclosure

extension SubscriptionView {
    var externalPaymentDisclosure: some View {
        VStack(spacing: 0) {
            // Header
            HStack {
                Spacer()
                Button(action: { showDisclosure = false }) {
                    Image(systemName: "xmark.circle.fill")
                        .font(.system(size: 28))
                        .foregroundStyle(DesignTokens.Text.muted)
                }
            }
            .padding(DesignTokens.Spacing.lg)

            // Content
            VStack(spacing: DesignTokens.Spacing.xl) {
                Image(systemName: "safari.fill")
                    .font(.system(size: 60))
                    .foregroundStyle(DesignTokens.Primary.default)

                VStack(spacing: DesignTokens.Spacing.md) {
                    Text(localization.t("subscription.externalPaymentTitle"))
                        .font(.system(size: DesignTokens.FontSize.xl, weight: .bold))
                        .foregroundStyle(DesignTokens.Text.primary)
                        .multilineTextAlignment(.center)

                    Text(localization.t("subscription.externalPaymentMessage"))
                        .font(.system(size: DesignTokens.FontSize.md))
                        .foregroundStyle(DesignTokens.Text.secondary)
                        .multilineTextAlignment(.center)
                        .fixedSize(horizontal: false, vertical: true)
                }

                VStack(spacing: DesignTokens.Spacing.sm) {
                    GlassButton(
                        localization.t("subscription.continueToWebsite"),
                        variant: .primary
                    ) {
                        if let url = pendingCheckoutURL {
                            UIApplication.shared.open(url, options: [:]) { success in
                                if !success {
                                    Task { @MainActor in
                                        viewModel?.setError("Failed to open subscription page. Please try again.")
                                    }
                                }
                            }
                        }
                        showDisclosure = false
                    }

                    GlassButton(
                        localization.t("common.cancel"),
                        variant: .ghost
                    ) {
                        showDisclosure = false
                        pendingCheckoutURL = nil
                    }
                }
            }
            .padding(DesignTokens.Spacing.xl)

            Spacer()
        }
        .background(DesignTokens.Background.primary)
        .presentationDetents([.medium])
        .presentationDragIndicator(.visible)
    }
}
