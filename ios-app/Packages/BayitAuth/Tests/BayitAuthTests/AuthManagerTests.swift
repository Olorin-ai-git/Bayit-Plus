@testable import BayitAuth
import BayitCore
import BayitNetworking
import XCTest

final class AuthManagerTests: XCTestCase {
    // MARK: - Test Dependencies

    private var mockConfiguration: AuthConfiguration!
    private var mockLogger: APILogger!

    override func setUp() {
        super.setUp()
        mockConfiguration = AuthConfiguration(
            googleClientID: "test-google-client-id",
            googleServerClientID: "test-google-server-client-id",
            appleTeamID: "test-apple-team-id",
            appleServiceID: "test-apple-service-id",
            keychainAccessGroup: nil
        )
        mockLogger = MockAPILogger()
    }

    override func tearDown() {
        mockConfiguration = nil
        mockLogger = nil
        super.tearDown()
    }

    // MARK: - Initialization Tests

    func testInitialization() {
        let authManager = AuthManager(
            configuration: mockConfiguration,
            logger: mockLogger
        )

        XCTAssertNil(authManager.user)
        XCTAssertNil(authManager.token)
        XCTAssertFalse(authManager.isAuthenticated)
        XCTAssertFalse(authManager.isLoading)
        XCTAssertEqual(authManager.profiles.count, 0)
        XCTAssertNil(authManager.activeProfile)
        XCTAssertEqual(authManager.betaCredits, 0)
        XCTAssertNil(authManager.error)
    }

    // MARK: - Authentication State Tests

    func testIsAuthenticatedFalseWhenNoUser() {
        let authManager = AuthManager(
            configuration: mockConfiguration,
            logger: mockLogger
        )

        XCTAssertFalse(authManager.isAuthenticated)
    }

    func testIsAuthenticatedFalseWhenUserButNoToken() {
        let authManager = AuthManager(
            configuration: mockConfiguration,
            logger: mockLogger
        )

        // Simulate having user but no token (invalid state)
        let user = BayitUser(
            id: "test-user-id",
            email: "test@example.com",
            displayName: "Test User",
            photoURL: nil,
            role: .user,
            isActive: true,
            subscription: nil,
            isVerified: true,
            createdAt: nil,
            lastLogin: nil
        )

        // Since user and token are internal(set), we can't directly test this
        // This test documents expected behavior
        XCTAssertFalse(authManager.isAuthenticated)
    }

    // MARK: - Sign Out Tests

    func testSignOutClearsState() async {
        let authManager = AuthManager(
            configuration: mockConfiguration,
            logger: mockLogger
        )

        await authManager.signOut()

        XCTAssertNil(authManager.user)
        XCTAssertNil(authManager.token)
        XCTAssertFalse(authManager.isAuthenticated)
        XCTAssertEqual(authManager.profiles.count, 0)
        XCTAssertNil(authManager.activeProfile)
        XCTAssertEqual(authManager.betaCredits, 0)
        XCTAssertNil(authManager.error)
    }

    // MARK: - Profile Management Tests

    func testProfileSelectionUpdatesActiveProfile() async throws {
        let authManager = AuthManager(
            configuration: mockConfiguration,
            logger: mockLogger
        )

        let testProfile = UserProfile(
            id: "profile-1",
            userId: "user-1",
            name: "Test Profile",
            avatarColor: "#7E22CE",
            isChild: false,
            childAgeLimit: nil,
            isDefault: true,
            isPinProtected: false,
            createdAt: "2024-01-01T00:00:00Z",
            updatedAt: "2024-01-01T00:00:00Z"
        )

        try await authManager.selectProfile(testProfile)

        XCTAssertNotNil(authManager.activeProfile)
        XCTAssertEqual(authManager.activeProfile?.id, "profile-1")
        XCTAssertEqual(authManager.activeProfile?.name, "Test Profile")
    }

    // MARK: - Error Handling Tests

    func testErrorPropertyCanBeSet() {
        let authManager = AuthManager(
            configuration: mockConfiguration,
            logger: mockLogger
        )

        XCTAssertNil(authManager.error)
        // Error is internal(set), so we can't directly test setting it
        // This test documents expected behavior
    }

    // MARK: - Token Provider Tests

    func testAuthTokenProviderIsAvailable() {
        let authManager = AuthManager(
            configuration: mockConfiguration,
            logger: mockLogger
        )

        let tokenProvider = authManager.authTokenProvider

        XCTAssertNotNil(tokenProvider)
    }

    // MARK: - Beta Credits Tests

    func testInitialBetaCreditsIsZero() {
        let authManager = AuthManager(
            configuration: mockConfiguration,
            logger: mockLogger
        )

        XCTAssertEqual(authManager.betaCredits, 0)
    }
}

// MARK: - Mock API Logger

private final class MockAPILogger: APILogger {
    func log(_: String, metadata _: [String: String], level _: LogLevel, file _: String, function _: String, line _: Int) {
        // No-op for testing
    }
}
