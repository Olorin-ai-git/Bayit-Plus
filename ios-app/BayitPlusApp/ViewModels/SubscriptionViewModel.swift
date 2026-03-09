import Foundation
import Observation
import StoreKit

/// ViewModel for the Subscription screen - manages StoreKit 2 purchases
/// and current subscription state.
@MainActor
@Observable
final class SubscriptionViewModel {
    private(set) var isLoading = false
    private(set) var error: String?
    private(set) var isProcessing = false

    var selectedBillingPeriod: BillingPeriod = .monthly

    private let storeManager: StoreManager

    init(storeManager: StoreManager) {
        self.storeManager = storeManager
    }

    var monthlyProduct: Product? {
        storeManager.monthlyProduct
    }

    var yearlyProduct: Product? {
        storeManager.yearlyProduct
    }

    var isSubscribed: Bool {
        storeManager.isPlusSubscribed
    }

    var selectedProduct: Product? {
        switch selectedBillingPeriod {
        case .monthly: return monthlyProduct
        case .yearly: return yearlyProduct
        }
    }

    @MainActor
    func load() async {
        guard !isLoading else { return }
        isLoading = true
        error = nil
        await storeManager.loadProducts()
        if let storeError = storeManager.error {
            error = storeError
        }
        isLoading = false
    }

    @MainActor
    func purchase() async -> Bool {
        guard let product = selectedProduct else {
            error = "No product selected"
            return false
        }
        isProcessing = true
        error = nil
        defer { isProcessing = false }

        let success = await storeManager.purchase(product)
        if let storeError = storeManager.error {
            error = storeError
        }
        return success
    }

    @MainActor
    func restorePurchases() async {
        isProcessing = true
        error = nil
        await storeManager.restorePurchases()
        if let storeError = storeManager.error {
            error = storeError
        }
        isProcessing = false
    }

    /// Localization key for the selected billing period label.
    var billingPeriodKey: String {
        switch selectedBillingPeriod {
        case .monthly:
            return "subscription.monthlyPlan"
        case .yearly:
            return "subscription.yearlyPlan"
        }
    }

    func setError(_ message: String) {
        error = message
    }
}

/// Billing period options for subscription checkout.
enum BillingPeriod: String, CaseIterable, Sendable {
    case monthly
    case yearly
}
