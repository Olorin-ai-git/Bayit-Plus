import Foundation

// MARK: - Subscription Plans

/// Response from GET /api/v1/subscriptions/plans
struct SubscriptionPlansResponse: Decodable, Sendable {
    let plans: [SubscriptionPlan]
}

/// A subscription plan with pricing and feature details.
struct SubscriptionPlan: Decodable, Sendable, Identifiable {
    let id: String
    let name: String
    let price: Double
    let priceYearly: Double?
    let includesAi: Bool?
    let aiCredits: Int?
    let maxWidgets: Int?
    let maxProfiles: Int?
    let prioritySupport: Bool?
}

/// Response from GET /api/v1/subscriptions/current
struct CurrentSubscriptionResponse: Decodable, Sendable {
    let subscription: SubscriptionDetail?
}

/// Active subscription details.
struct SubscriptionDetail: Decodable, Sendable, Identifiable {
    let id: String
    let plan: String?
    let status: String?
    let billingPeriod: String?
    let currentPeriodEnd: String?
    let cancelAtPeriodEnd: Bool?
    let price: String?
}

/// Request body for POST /api/v1/subscriptions/checkout
struct CheckoutRequest: Encodable, Sendable {
    let planId: String
    let billingPeriod: String
}

/// Response from POST /api/v1/subscriptions/checkout
struct CheckoutResponse: Decodable, Sendable {
    let checkoutUrl: String?
}

// MARK: - Billing

/// Response from GET /api/v1/admin/billing/transactions (user-scoped)
struct TransactionsResponse: Decodable, Sendable {
    let items: [Transaction]
    let total: Int?
    let page: Int?
    let totalPages: Int?
}

/// A billing transaction record.
struct Transaction: Decodable, Sendable, Identifiable {
    let id: String
    let amount: Double?
    let currency: String?
    let status: String?
    let description: String?
    let createdAt: String?
}

// MARK: - Security / Devices

/// Response from GET /api/v1/auth/devices
struct DevicesResponse: Decodable, Sendable {
    let devices: [DeviceInfo]
}

/// A registered device / active session.
struct DeviceInfo: Decodable, Sendable, Identifiable {
    let id: String
    let deviceName: String?
    let deviceType: String?
    let platform: String?
    let lastActive: String?
    let isCurrent: Bool?
}

/// Request body for POST /api/v1/auth/change-password
struct ChangePasswordRequest: Encodable, Sendable {
    let currentPassword: String
    let newPassword: String
}

// MARK: - Support

/// Response from GET /api/v1/support/faq
struct FAQResponse: Decodable, Sendable {
    let items: [FAQItem]
    let total: Int?
}

/// A frequently asked question entry.
struct FAQItem: Decodable, Sendable, Identifiable {
    let id: String
    let question: String?
    let answer: String?
    let category: String?
    let isFeatured: Bool?
}

/// Response from GET /api/v1/support/tickets
struct TicketsResponse: Decodable, Sendable {
    let tickets: [SupportTicket]
    let total: Int?
    let page: Int?
    let totalPages: Int?
}

/// A support ticket.
struct SupportTicket: Decodable, Sendable, Identifiable {
    let id: String
    let subject: String?
    let message: String?
    let category: String?
    let status: String?
    let priority: String?
    let createdAt: String?
    let updatedAt: String?
}

/// Request body for POST /api/v1/support/tickets
struct CreateTicketRequest: Encodable, Sendable {
    let subject: String
    let message: String
    let category: String
    let priority: String
    let language: String
}

// MARK: - IAP Verification

/// Request body for POST /api/v1/subscriptions/verify-apple
struct AppleVerifyRequest: Encodable, Sendable {
    let transactionId: String
    let signedTransaction: String
}

/// Response from POST /api/v1/subscriptions/verify-apple
struct AppleVerifyResponse: Decodable, Sendable {
    let status: String
    let tier: String?
}

// MARK: - User Preferences Update

/// Request body for PATCH /api/v1/users/me/preferences
struct UserPreferencesUpdate: Encodable, Sendable {
    let autoTranslateEnabled: Bool?
    let showIsraelTime: Bool?
    let shabbatModeEnabled: Bool?
    let subtitlesEnabled: Bool?
    let interactiveMomentsEnabled: Bool?
    let showWidgetsDock: Bool?
    let showVoiceControlFAB: Bool?
    let autoplayEnabled: Bool?
    let notificationsEnabled: Bool?
}

/// Response from PATCH /api/v1/users/me/preferences
struct UserPreferencesResponse: Decodable, Sendable {
    let preferences: UserPreferencesDetail?
    let preferredLanguage: String?
}

/// Detailed user preferences from backend.
struct UserPreferencesDetail: Decodable, Sendable {
    let autoTranslateEnabled: Bool?
    let showIsraelTime: Bool?
    let shabbatModeEnabled: Bool?
    let subtitlesEnabled: Bool?
    let interactiveMomentsEnabled: Bool?
    let showWidgetsDock: Bool?
    let showVoiceControlFAB: Bool?
    let autoplayEnabled: Bool?
    let notificationsEnabled: Bool?
}
