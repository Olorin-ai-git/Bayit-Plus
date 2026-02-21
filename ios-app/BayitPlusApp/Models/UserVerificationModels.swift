import Foundation

// MARK: - Verification

/// Request body for POST /api/v1/verification/phone/send
struct PhoneVerificationRequest: Encodable, Sendable {
    let phoneNumber: String

    enum CodingKeys: String, CodingKey {
        case phoneNumber = "phone_number"
    }
}

/// Response from POST /api/v1/verification/phone/send
struct PhoneVerificationSendResponse: Decodable, Sendable {
    let message: String?
    let phoneNumber: String?

    enum CodingKeys: String, CodingKey {
        case message
        case phoneNumber = "phone_number"
    }
}

/// Request body for POST /api/v1/verification/phone/verify
struct PhoneVerificationCodeRequest: Encodable, Sendable {
    let code: String
}

/// Response from POST /api/v1/verification/phone/verify
struct PhoneVerificationResponse: Decodable, Sendable {
    let message: String?
    let phoneVerified: Bool?
    let isVerified: Bool?

    enum CodingKeys: String, CodingKey {
        case message
        case phoneVerified = "phone_verified"
        case isVerified = "is_verified"
    }
}

/// Response from GET /api/v1/verification/status
struct VerificationStatusResponse: Decodable, Sendable {
    let emailVerified: Bool?
    let phoneVerified: Bool?
    let isVerified: Bool?
    let isAdmin: Bool?
    let phoneNumber: String?
    let email: String?

    enum CodingKeys: String, CodingKey {
        case emailVerified = "email_verified"
        case phoneVerified = "phone_verified"
        case isVerified = "is_verified"
        case isAdmin = "is_admin"
        case phoneNumber = "phone_number"
        case email
    }
}
