import Foundation
import Observation
import StoreKit

/// ViewModel for the Subscription Gate - manages StoreKit 2 purchases
/// for content requiring a Plus subscription.
@MainActor
@Observable
final class SubscriptionGateViewModel {
    private(set) var isLoading = false
    private(set) var error: String?
    private(set) var isProcessing = false
    private(set) var gateInfo: SubscriptionGateInfo?

    var selectedBillingPeriod: BillingPeriod = .monthly

    private let storeManager: StoreManager
    private let contentId: String
    private let requiredTier: String

    init(
        storeManager: StoreManager,
        contentId: String,
        requiredTier: String
    ) {
        self.storeManager = storeManager
        self.contentId = contentId
        self.requiredTier = requiredTier
    }

    var monthlyProduct: Product? {
        storeManager.monthlyProduct
    }

    var yearlyProduct: Product? {
        storeManager.yearlyProduct
    }

    var selectedProduct: Product? {
        switch selectedBillingPeriod {
        case .monthly: return monthlyProduct
        case .yearly: return yearlyProduct
        }
    }

    var hasProducts: Bool {
        monthlyProduct != nil || yearlyProduct != nil
    }

    @MainActor
    func load() async {
        guard !isLoading else { return }
        isLoading = true
        error = nil

        await storeManager.loadProducts()
        gateInfo = SubscriptionGateInfo(
            contentId: contentId,
            requiredTier: requiredTier
        )

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
}

/// Local gate info for content that requires a subscription tier.
struct SubscriptionGateInfo: Sendable {
    let contentId: String
    let requiredTier: String
}
