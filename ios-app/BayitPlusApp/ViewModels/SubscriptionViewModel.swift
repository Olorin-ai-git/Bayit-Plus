import Foundation
import Observation

/// ViewModel for the Subscription screen - manages plan selection and
/// current subscription state.
@MainActor
@Observable
final class SubscriptionViewModel {
    private(set) var plans: [SubscriptionPlan] = []
    private(set) var currentSubscription: SubscriptionDetail?
    private(set) var isLoading = false
    private(set) var error: String?
    private(set) var isProcessing = false

    var selectedBillingPeriod: BillingPeriod = .monthly

    private let repository: any SettingsRepository

    init(repository: any SettingsRepository) {
        self.repository = repository
    }

    @MainActor
    func load() async {
        guard !isLoading else { return }
        isLoading = true
        error = nil

        do {
            async let plansResult = repository.fetchPlans()
            async let subResult = repository.fetchCurrentSubscription()
            plans = try await plansResult.plans
            currentSubscription = try await subResult.subscription
        } catch {
            if let message = error.userFriendlyMessage {
                self.error = message
            }
        }

        isLoading = false
    }

    @MainActor
    func subscribe(to plan: SubscriptionPlan) async -> URL? {
        isProcessing = true
        error = nil

        defer { isProcessing = false }

        do {
            let request = CheckoutRequest(
                planId: plan.id,
                billingPeriod: selectedBillingPeriod.rawValue
            )
            let response = try await repository.createCheckout(request: request)
            if let urlString = response.checkoutUrl {
                return URL(string: urlString)
            }
        } catch {
            if let message = error.userFriendlyMessage {
                self.error = message
            }
        }

        return nil
    }

    @MainActor
    func cancelSubscription() async {
        isProcessing = true
        error = nil

        do {
            _ = try await repository.cancelSubscription()
            await load()
        } catch {
            if let message = error.userFriendlyMessage {
                self.error = message
            }
        }

        isProcessing = false
    }

    /// Display text for the selected billing period (no pricing per Apple guidelines).
    func displayPrice(for plan: SubscriptionPlan) -> String {
        switch selectedBillingPeriod {
        case .monthly:
            return "Monthly Plan"
        case .yearly:
            return "Yearly Plan"
        }
    }

    var isSubscribed: Bool {
        currentSubscription?.status == "active"
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
