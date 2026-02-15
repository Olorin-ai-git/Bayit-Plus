import Foundation
import Observation

/// ViewModel for the Subscription Gate - fetches plans and manages
/// gating state for content requiring a subscription tier.
@MainActor
@Observable
final class SubscriptionGateViewModel {
    private(set) var plans: [SubscriptionPlan] = []
    private(set) var gateInfo: SubscriptionGateInfo?
    private(set) var isLoading = false
    private(set) var error: String?
    private(set) var isProcessing = false

    var selectedPlan: SubscriptionPlan?

    private let settingsRepository: any SettingsRepository
    private let contentId: String
    private let requiredTier: String

    init(
        settingsRepository: any SettingsRepository,
        contentId: String,
        requiredTier: String
    ) {
        self.settingsRepository = settingsRepository
        self.contentId = contentId
        self.requiredTier = requiredTier
    }

    @MainActor
    func load() async {
        guard !isLoading else { return }
        isLoading = true
        error = nil

        do {
            let plansResponse = try await settingsRepository.fetchPlans()
            plans = plansResponse.plans
            gateInfo = SubscriptionGateInfo(
                contentId: contentId,
                requiredTier: requiredTier
            )
            if selectedPlan == nil {
                selectedPlan = plans.first(where: { $0.name.lowercased().contains("premium") })
                    ?? plans.last
            }
        } catch {
            if let message = error.userFriendlyMessage {
                self.error = message
            }
        }

        isLoading = false
    }

    @MainActor
    func subscribe(to plan: SubscriptionPlan, billingPeriod: BillingPeriod) async -> URL? {
        isProcessing = true
        error = nil

        defer { isProcessing = false }

        do {
            let request = CheckoutRequest(
                planId: plan.id,
                billingPeriod: billingPeriod.rawValue
            )
            let response = try await settingsRepository.createCheckout(request: request)
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

    var isRecommended: (SubscriptionPlan) -> Bool {
        { plan in
            plan.name.lowercased().contains("premium")
        }
    }
}

/// Local gate info for content that requires a subscription tier.
struct SubscriptionGateInfo: Sendable {
    let contentId: String
    let requiredTier: String
}
