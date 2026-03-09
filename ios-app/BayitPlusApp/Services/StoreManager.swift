import BayitCore
import BayitNetworking
import Foundation
import Observation
import StoreKit

/// Type alias to disambiguate StoreKit.Transaction from local Transaction model.
private typealias SKTransaction = StoreKit.Transaction

/// Manages StoreKit 2 in-app purchases for Bayit+ Plus subscription.
@MainActor
@Observable
final class StoreManager {
    private(set) var products: [Product] = []
    private(set) var purchasedProductIDs: Set<String> = []
    private(set) var isLoading = false
    private(set) var error: String?

    private let productIDs: Set<String>
    private let apiClient: APIClient
    private let logger = BayitLogger(category: "StoreManager")
    private var transactionListener: Task<Void, Never>?

    var monthlyProduct: Product? {
        products.first { $0.id == monthlyProductID }
    }

    var yearlyProduct: Product? {
        products.first { $0.id == yearlyProductID }
    }

    var isPlusSubscribed: Bool {
        !purchasedProductIDs.isEmpty
    }

    private let monthlyProductID: String
    private let yearlyProductID: String

    nonisolated init(config: EnvironmentConfiguration, apiClient: APIClient) {
        monthlyProductID = config.iapPlusMonthlyProductId
        yearlyProductID = config.iapPlusYearlyProductId
        productIDs = [monthlyProductID, yearlyProductID]
        self.apiClient = apiClient
    }

    func startListening() {
        guard transactionListener == nil else { return }
        transactionListener = listenForTransactions()
    }

    // Transaction listener uses [weak self] and stops when self is deallocated.

    // MARK: - Product Loading

    func loadProducts() async {
        startListening()
        guard !isLoading else { return }
        isLoading = true
        error = nil

        do {
            products = try await Product.products(for: productIDs)
                .sorted { $0.price < $1.price }
            await updatePurchasedProducts()
            logger.info("Loaded \(products.count) products")
        } catch {
            self.error = error.localizedDescription
            logger.error("Failed to load products: \(error)")
        }

        isLoading = false
    }

    // MARK: - Purchasing

    func purchase(_ product: Product) async -> Bool {
        do {
            let result = try await product.purchase()

            switch result {
            case let .success(verification):
                let transaction = try checkVerified(verification)
                let jwsString = verification.jwsRepresentation
                let verified = await sendTransactionToBackend(
                    transaction,
                    signedTransaction: jwsString
                )
                if verified {
                    purchasedProductIDs.insert(product.id)
                    await transaction.finish()
                    logger.info("Purchase completed: \(product.id)")
                    return true
                } else {
                    logger.error("Backend verification failed for \(product.id)")
                    error = "Purchase verification failed"
                    return false
                }

            case .userCancelled:
                logger.info("User cancelled purchase")
                return false

            case .pending:
                logger.info("Purchase pending approval")
                return false

            @unknown default:
                return false
            }
        } catch {
            self.error = error.localizedDescription
            logger.error("Purchase failed: \(error)")
            return false
        }
    }

    // MARK: - Transaction Verification

    private nonisolated func checkVerified<T>(
        _ result: VerificationResult<T>
    ) throws -> T {
        switch result {
        case let .unverified(_, error):
            throw error
        case let .verified(safe):
            return safe
        }
    }

    private func sendTransactionToBackend(
        _ transaction: SKTransaction,
        signedTransaction: String
    ) async -> Bool {
        do {
            let request = AppleVerifyRequest(
                transactionId: String(transaction.originalID),
                signedTransaction: signedTransaction
            )
            let _: AppleVerifyResponse = try await apiClient.post(
                "/api/v1/subscriptions/verify-apple",
                body: request,
                as: AppleVerifyResponse.self
            )
            return true
        } catch {
            logger.error("Backend verify failed: \(error)")
            return false
        }
    }

    // MARK: - Transaction Updates

    private func listenForTransactions() -> Task<Void, Never> {
        Task.detached { [weak self] in
            for await result in SKTransaction.updates {
                guard let self else { return }
                do {
                    let transaction = try self.checkVerified(result)
                    let jwsString = result.jwsRepresentation
                    _ = await self.sendTransactionToBackend(
                        transaction,
                        signedTransaction: jwsString
                    )
                    await transaction.finish()
                    await self.updatePurchasedProducts()
                } catch {
                    await MainActor.run {
                        self.logger.error("Transaction update failed: \(error)")
                    }
                }
            }
        }
    }

    private func updatePurchasedProducts() async {
        var purchased: Set<String> = []
        for await result in SKTransaction.currentEntitlements {
            if case let .verified(transaction) = result,
               productIDs.contains(transaction.productID)
            {
                purchased.insert(transaction.productID)
            }
        }
        purchasedProductIDs = purchased
    }

    // MARK: - Restore

    func restorePurchases() async {
        isLoading = true
        error = nil

        do {
            try await AppStore.sync()
            await updatePurchasedProducts()
            logger.info("Purchases restored, active: \(purchasedProductIDs)")
        } catch {
            self.error = error.localizedDescription
            logger.error("Restore failed: \(error)")
        }

        isLoading = false
    }
}
