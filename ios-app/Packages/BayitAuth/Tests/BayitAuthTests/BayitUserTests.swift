import XCTest
@testable import BayitAuth

final class BayitUserTests: XCTestCase {

    // MARK: - Initialization Tests

    func testUserInitialization() {
        let user = BayitUser(
            id: "user-123",
            email: "test@bayit.tv",
            displayName: "Test User",
            photoURL: URL(string: "https://example.com/avatar.jpg"),
            role: .user,
            isActive: true,
            subscription: nil,
            isBetaUser: true,
            isVerified: true,
            createdAt: "2024-01-01T00:00:00Z",
            lastLogin: "2024-01-10T12:00:00Z"
        )

        XCTAssertEqual(user.id, "user-123")
        XCTAssertEqual(user.email, "test@bayit.tv")
        XCTAssertEqual(user.displayName, "Test User")
        XCTAssertEqual(user.photoURL?.absoluteString, "https://example.com/avatar.jpg")
        XCTAssertEqual(user.role, .user)
        XCTAssertTrue(user.isActive)
        XCTAssertNil(user.subscription)
        XCTAssertTrue(user.isBetaUser)
        XCTAssertTrue(user.isVerified)
        XCTAssertEqual(user.createdAt, "2024-01-01T00:00:00Z")
        XCTAssertEqual(user.lastLogin, "2024-01-10T12:00:00Z")
    }

    // MARK: - Subscription Tier Tests

    func testSubscriptionTierDefaultsToRegisteredFree() {
        let user = BayitUser(
            id: "user-123",
            email: "test@bayit.tv",
            displayName: "Test User",
            photoURL: nil,
            role: .user,
            isActive: true,
            subscription: nil,
            isBetaUser: false,
            isVerified: true,
            createdAt: nil,
            lastLogin: nil
        )

        XCTAssertEqual(user.subscriptionTier, .registeredFree)
    }

    func testSubscriptionTierFromSubscription() {
        let subscription = UserSubscription(
            plan: .premium,
            status: "active",
            validUntil: "2024-12-31T23:59:59Z"
        )

        let user = BayitUser(
            id: "user-123",
            email: "premium@bayit.tv",
            displayName: "Premium User",
            photoURL: nil,
            role: .user,
            isActive: true,
            subscription: subscription,
            isBetaUser: false,
            isVerified: true,
            createdAt: nil,
            lastLogin: nil
        )

        XCTAssertEqual(user.subscriptionTier, .premium)
    }

    // MARK: - VOD Access Tests

    func testCanWatchVODForVerifiedUserWithSubscription() {
        let subscription = UserSubscription(
            plan: .basic,
            status: "active",
            validUntil: "2024-12-31T23:59:59Z"
        )

        let user = BayitUser(
            id: "user-123",
            email: "test@bayit.tv",
            displayName: "Test User",
            photoURL: nil,
            role: .user,
            isActive: true,
            subscription: subscription,
            isBetaUser: false,
            isVerified: true,
            createdAt: nil,
            lastLogin: nil
        )

        XCTAssertTrue(user.canWatchVOD)
    }

    func testCannotWatchVODForUnverifiedUser() {
        let subscription = UserSubscription(
            plan: .basic,
            status: "active",
            validUntil: "2024-12-31T23:59:59Z"
        )

        let user = BayitUser(
            id: "user-123",
            email: "test@bayit.tv",
            displayName: "Test User",
            photoURL: nil,
            role: .user,
            isActive: true,
            subscription: subscription,
            isBetaUser: false,
            isVerified: false,
            createdAt: nil,
            lastLogin: nil
        )

        XCTAssertFalse(user.canWatchVOD)
    }

    func testCannotWatchVODForUserWithoutSubscription() {
        let user = BayitUser(
            id: "user-123",
            email: "test@bayit.tv",
            displayName: "Test User",
            photoURL: nil,
            role: .user,
            isActive: true,
            subscription: nil,
            isBetaUser: false,
            isVerified: true,
            createdAt: nil,
            lastLogin: nil
        )

        XCTAssertFalse(user.canWatchVOD)
    }

    func testAdminCanAlwaysWatchVOD() {
        let user = BayitUser(
            id: "admin-123",
            email: "admin@bayit.tv",
            displayName: "Admin User",
            photoURL: nil,
            role: .admin,
            isActive: true,
            subscription: nil,
            isBetaUser: false,
            isVerified: false,
            createdAt: nil,
            lastLogin: nil
        )

        XCTAssertTrue(user.canWatchVOD)
    }

    // MARK: - Premium Access Tests

    func testIsPremiumForPremiumSubscription() {
        let subscription = UserSubscription(
            plan: .premium,
            status: "active",
            validUntil: "2024-12-31T23:59:59Z"
        )

        let user = BayitUser(
            id: "user-123",
            email: "premium@bayit.tv",
            displayName: "Premium User",
            photoURL: nil,
            role: .user,
            isActive: true,
            subscription: subscription,
            isBetaUser: false,
            isVerified: true,
            createdAt: nil,
            lastLogin: nil
        )

        XCTAssertTrue(user.isPremium)
    }

    func testIsNotPremiumForBasicSubscription() {
        let subscription = UserSubscription(
            plan: .basic,
            status: "active",
            validUntil: "2024-12-31T23:59:59Z"
        )

        let user = BayitUser(
            id: "user-123",
            email: "basic@bayit.tv",
            displayName: "Basic User",
            photoURL: nil,
            role: .user,
            isActive: true,
            subscription: subscription,
            isBetaUser: false,
            isVerified: true,
            createdAt: nil,
            lastLogin: nil
        )

        XCTAssertFalse(user.isPremium)
    }

    func testAdminIsAlwaysPremium() {
        let user = BayitUser(
            id: "admin-123",
            email: "admin@bayit.tv",
            displayName: "Admin User",
            photoURL: nil,
            role: .admin,
            isActive: true,
            subscription: nil,
            isBetaUser: false,
            isVerified: true,
            createdAt: nil,
            lastLogin: nil
        )

        XCTAssertTrue(user.isPremium)
    }

    // MARK: - Codable Tests

    func testUserEncodingAndDecoding() throws {
        let originalUser = BayitUser(
            id: "user-123",
            email: "test@bayit.tv",
            displayName: "Test User",
            photoURL: URL(string: "https://example.com/avatar.jpg"),
            role: .user,
            isActive: true,
            subscription: UserSubscription(
                plan: .premium,
                status: "active",
                validUntil: "2024-12-31T23:59:59Z"
            ),
            isBetaUser: true,
            isVerified: true,
            createdAt: "2024-01-01T00:00:00Z",
            lastLogin: "2024-01-10T12:00:00Z"
        )

        let encoder = JSONEncoder()
        let data = try encoder.encode(originalUser)

        let decoder = JSONDecoder()
        let decodedUser = try decoder.decode(BayitUser.self, from: data)

        XCTAssertEqual(decodedUser.id, originalUser.id)
        XCTAssertEqual(decodedUser.email, originalUser.email)
        XCTAssertEqual(decodedUser.displayName, originalUser.displayName)
        XCTAssertEqual(decodedUser.photoURL, originalUser.photoURL)
        XCTAssertEqual(decodedUser.role, originalUser.role)
        XCTAssertEqual(decodedUser.isActive, originalUser.isActive)
        XCTAssertEqual(decodedUser.isBetaUser, originalUser.isBetaUser)
        XCTAssertEqual(decodedUser.isVerified, originalUser.isVerified)
    }

    // MARK: - Sendable Conformance

    func testUserIsSendable() {
        let user = BayitUser(
            id: "user-123",
            email: "test@bayit.tv",
            displayName: "Test User",
            photoURL: nil,
            role: .user,
            isActive: true,
            subscription: nil,
            isBetaUser: false,
            isVerified: true,
            createdAt: nil,
            lastLogin: nil
        )

        Task {
            let capturedUser = user
            XCTAssertEqual(capturedUser.id, "user-123")
            XCTAssertEqual(capturedUser.email, "test@bayit.tv")
        }
    }
}
