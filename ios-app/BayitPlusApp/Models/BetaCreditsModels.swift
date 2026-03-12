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
    let featureId: String?
    let contentId: String?

    init(amount: Int, reason: String, featureId: String? = nil, contentId: String? = nil) {
        self.amount = amount
        self.reason = reason
        self.featureId = featureId
        self.contentId = contentId
    }
}

/// Extended response from credit deduction supporting dedup.
struct CreditDeductResponse: Decodable, Sendable {
    let remainingCredits: Int?
    let totalCredits: Int?
    let usedCredits: Int?
    let isLow: Bool?
    let isCritical: Bool?
    let alreadyUnlocked: Bool?

    var toBalance: CreditBalance {
        CreditBalance(
            remainingCredits: remainingCredits,
            totalCredits: totalCredits,
            usedCredits: usedCredits,
            isLow: isLow,
            isCritical: isCritical
        )
    }
}
