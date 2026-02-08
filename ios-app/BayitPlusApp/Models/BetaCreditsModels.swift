import Foundation

// MARK: - Beta 500 Credits

/// Current credit balance for a Beta 500 user.
struct CreditBalance: Decodable, Sendable {
    let remainingCredits: Int?
    let totalCredits: Int?
    let usedCredits: Int?
    let isLow: Bool?
    let isCritical: Bool?
}

/// Request body for POST /api/v1/beta/credits/deduct
struct CreditDeductRequest: Encodable, Sendable {
    let amount: Int
    let reason: String
}
