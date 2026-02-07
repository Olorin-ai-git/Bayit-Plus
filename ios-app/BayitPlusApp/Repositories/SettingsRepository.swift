import BayitNetworking
import Foundation

/// Repository protocol for settings, subscriptions, billing, security,
/// and support API operations.
protocol SettingsRepository: Sendable {

    // MARK: - Preferences

    /// Fetch user preferences.
    func fetchPreferences() async throws -> UserPreferencesResponse

    /// Update user preferences.
    func updatePreferences(
        request: UserPreferencesUpdate
    ) async throws -> UserPreferencesResponse

    // MARK: - Subscriptions

    /// Fetch available subscription plans.
    func fetchPlans() async throws -> SubscriptionPlansResponse

    /// Fetch the current user's subscription.
    func fetchCurrentSubscription() async throws -> CurrentSubscriptionResponse

    /// Create a checkout session for a plan.
    func createCheckout(
        request: CheckoutRequest
    ) async throws -> CheckoutResponse

    /// Cancel the current subscription at period end.
    func cancelSubscription() async throws -> MessageResponse

    // MARK: - Billing

    /// Fetch the user's transaction history.
    func fetchTransactions(
        page: Int, limit: Int
    ) async throws -> TransactionsResponse

    // MARK: - Security

    /// Fetch the user's registered devices.
    func fetchDevices() async throws -> DevicesResponse

    /// Change the user's password.
    func changePassword(
        request: ChangePasswordRequest
    ) async throws -> MessageResponse

    /// Remove a device / revoke a session.
    func removeDevice(deviceId: String) async throws -> MessageResponse

    // MARK: - Support

    /// Fetch FAQ entries.
    func fetchFAQ(language: String) async throws -> FAQResponse

    /// Fetch the user's support tickets.
    func fetchTickets(
        page: Int, limit: Int
    ) async throws -> TicketsResponse

    /// Create a new support ticket.
    func createTicket(
        request: CreateTicketRequest
    ) async throws -> SupportTicket
}

/// Production implementation of `SettingsRepository` using `APIClient`.
final class APISettingsRepository: SettingsRepository, @unchecked Sendable {

    private let client: APIClient

    init(client: APIClient) {
        self.client = client
    }

    // MARK: - Preferences

    func fetchPreferences() async throws -> UserPreferencesResponse {
        try await client.get(
            "/api/v1/users/me/preferences",
            as: UserPreferencesResponse.self
        )
    }

    func updatePreferences(
        request: UserPreferencesUpdate
    ) async throws -> UserPreferencesResponse {
        try await client.patch(
            "/api/v1/users/me/preferences",
            body: request,
            as: UserPreferencesResponse.self
        )
    }

    // MARK: - Subscriptions

    func fetchPlans() async throws -> SubscriptionPlansResponse {
        try await client.get(
            "/api/v1/subscriptions/plans",
            as: SubscriptionPlansResponse.self
        )
    }

    func fetchCurrentSubscription() async throws -> CurrentSubscriptionResponse {
        try await client.get(
            "/api/v1/subscriptions/current",
            as: CurrentSubscriptionResponse.self
        )
    }

    func createCheckout(
        request: CheckoutRequest
    ) async throws -> CheckoutResponse {
        try await client.post(
            "/api/v1/subscriptions/checkout",
            body: request,
            as: CheckoutResponse.self
        )
    }

    func cancelSubscription() async throws -> MessageResponse {
        try await client.post(
            "/api/v1/subscriptions/cancel",
            body: EmptyBody(),
            as: MessageResponse.self
        )
    }

    // MARK: - Billing

    func fetchTransactions(
        page: Int, limit: Int
    ) async throws -> TransactionsResponse {
        let queryItems = [
            URLQueryItem(name: "page", value: String(page)),
            URLQueryItem(name: "page_size", value: String(limit)),
        ]
        return try await client.get(
            "/api/v1/billing/transactions",
            queryItems: queryItems,
            as: TransactionsResponse.self
        )
    }

    // MARK: - Security

    func fetchDevices() async throws -> DevicesResponse {
        try await client.get(
            "/api/v1/auth/devices",
            as: DevicesResponse.self
        )
    }

    func changePassword(
        request: ChangePasswordRequest
    ) async throws -> MessageResponse {
        try await client.post(
            "/api/v1/auth/change-password",
            body: request,
            as: MessageResponse.self
        )
    }

    func removeDevice(deviceId: String) async throws -> MessageResponse {
        try await client.delete(
            "/api/v1/auth/devices/\(deviceId)",
            as: MessageResponse.self
        )
    }

    // MARK: - Support

    func fetchFAQ(language: String) async throws -> FAQResponse {
        let queryItems = [URLQueryItem(name: "language", value: language)]
        return try await client.get(
            "/api/v1/support/faq",
            queryItems: queryItems,
            as: FAQResponse.self
        )
    }

    func fetchTickets(
        page: Int, limit: Int
    ) async throws -> TicketsResponse {
        let queryItems = [
            URLQueryItem(name: "page", value: String(page)),
            URLQueryItem(name: "page_size", value: String(limit)),
        ]
        return try await client.get(
            "/api/v1/support/tickets",
            queryItems: queryItems,
            as: TicketsResponse.self
        )
    }

    func createTicket(
        request: CreateTicketRequest
    ) async throws -> SupportTicket {
        try await client.post(
            "/api/v1/support/tickets",
            body: request,
            as: SupportTicket.self
        )
    }
}
