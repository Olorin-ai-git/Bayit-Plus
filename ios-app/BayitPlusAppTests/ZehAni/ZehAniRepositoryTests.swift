import XCTest
@testable import BayitPlusApp

final class ZehAniRepositoryTests: XCTestCase {

    var repository: APIZehAniRepository!
    var mockClient: MockAPIClient!

    override func setUp() {
        super.setUp()
        mockClient = MockAPIClient()
        repository = APIZehAniRepository(client: mockClient)
    }

    override func tearDown() {
        repository = nil
        mockClient = nil
        super.tearDown()
    }

    // MARK: - Highlight Reels Tests

    func testListHighlightReels() async throws {
        // Given
        let profileId = "test_profile_123"
        let expectedReels = [
            HighlightReelItem(
                id: "reel_1",
                userId: "user_123",
                profileId: profileId,
                avatarId: "avatar_123",
                momentCount: 5,
                hasVideo: true,
                hasThumbnail: true,
                shareToken: "token_123",
                status: "ready",
                creditsCharged: 100,
                errorMessage: nil,
                createdAt: "2024-01-01T00:00:00Z",
                updatedAt: "2024-01-01T00:00:00Z"
            )
        ]

        mockClient.mockResponse = expectedReels

        // When
        let reels = try await repository.listHighlightReels(profileId: profileId)

        // Then
        XCTAssertEqual(reels.count, 1)
        XCTAssertEqual(reels.first?.id, "reel_1")
        XCTAssertEqual(mockClient.lastRequestPath, "/api/v1/zeh-ani/highlights/\(profileId)")
    }

    func testGenerateHighlightReel() async throws {
        // Given
        let profileId = "test_profile_123"
        let expectedReel = HighlightReelItem(
            id: "reel_new",
            userId: "user_123",
            profileId: profileId,
            avatarId: "avatar_123",
            momentCount: 0,
            hasVideo: false,
            hasThumbnail: false,
            shareToken: nil,
            status: "generating",
            creditsCharged: 0,
            errorMessage: nil,
            createdAt: "2024-01-01T00:00:00Z",
            updatedAt: "2024-01-01T00:00:00Z"
        )

        mockClient.mockResponse = expectedReel

        // When
        let reel = try await repository.generateHighlightReel(profileId: profileId)

        // Then
        XCTAssertEqual(reel.id, "reel_new")
        XCTAssertEqual(reel.status, "generating")
    }

    // MARK: - Contacts Tests

    func testListContacts() async throws {
        // Given
        let profileId = "test_profile_123"
        let expectedContacts = [
            WhatsAppContactItem(
                id: "contact_1",
                profileId: profileId,
                phoneNumber: "+972501234567",
                displayName: "Test Contact",
                relationship: "family",
                language: "he",
                createdAt: "2024-01-01T00:00:00Z"
            )
        ]

        mockClient.mockResponse = expectedContacts

        // When
        let contacts = try await repository.listContacts(profileId: profileId)

        // Then
        XCTAssertEqual(contacts.count, 1)
        XCTAssertEqual(contacts.first?.displayName, "Test Contact")
    }

    func testAddContact() async throws {
        // Given
        let profileId = "test_profile_123"
        let phoneNumber = "+972501234567"
        let displayName = "New Contact"
        let relationship = "friend"
        let language = "en"
        let pin = "123456"

        let expectedContact = WhatsAppContactItem(
            id: "contact_new",
            profileId: profileId,
            phoneNumber: phoneNumber,
            displayName: displayName,
            relationship: relationship,
            language: language,
            createdAt: "2024-01-01T00:00:00Z"
        )

        mockClient.mockResponse = expectedContact

        // When
        let contact = try await repository.addContact(
            profileId: profileId,
            phoneNumber: phoneNumber,
            displayName: displayName,
            relationship: relationship,
            language: language,
            pin: pin
        )

        // Then
        XCTAssertEqual(contact.id, "contact_new")
        XCTAssertEqual(contact.displayName, displayName)
    }

    func testRemoveContact() async throws {
        // Given
        let contactId = "contact_123"
        mockClient.mockResponse = ["success": true]

        // When
        let success = try await repository.removeContact(contactId: contactId)

        // Then
        XCTAssertTrue(success)
        XCTAssertEqual(mockClient.lastRequestPath, "/api/v1/zeh-ani/contacts/\(contactId)")
        XCTAssertEqual(mockClient.lastRequestMethod, "DELETE")
    }

    // MARK: - Feedback Tests

    func testGetFeedbackHistory() async throws {
        // Given
        let profileId = "test_profile_123"
        let expectedFeedback = [
            FeedbackItem(
                id: "feedback_1",
                profileId: profileId,
                featureType: "magic_mirror",
                feedbackText: "Great experience!",
                rating: 5,
                metadata: ["key": "value"],
                createdAt: "2024-01-01T00:00:00Z"
            )
        ]

        mockClient.mockResponse = expectedFeedback

        // When
        let feedback = try await repository.getFeedbackHistory(profileId: profileId)

        // Then
        XCTAssertEqual(feedback.count, 1)
        XCTAssertEqual(feedback.first?.feedbackText, "Great experience!")
        XCTAssertEqual(feedback.first?.rating, 5)
    }
}

// MARK: - Mock API Client

class MockAPIClient: APIClient {
    var mockResponse: Any?
    var mockError: Error?
    var lastRequestPath: String?
    var lastRequestMethod: String?
    var lastRequestBody: Any?

    override func get<T: Decodable>(_ path: String, as type: T.Type) async throws -> T {
        lastRequestPath = path
        lastRequestMethod = "GET"

        if let error = mockError {
            throw error
        }

        guard let response = mockResponse as? T else {
            throw URLError(.badServerResponse)
        }

        return response
    }

    override func post<T: Decodable>(_ path: String, body: some Encodable, as type: T.Type) async throws -> T {
        lastRequestPath = path
        lastRequestMethod = "POST"
        lastRequestBody = body

        if let error = mockError {
            throw error
        }

        guard let response = mockResponse as? T else {
            throw URLError(.badServerResponse)
        }

        return response
    }

    override func delete<T: Decodable>(_ path: String, as type: T.Type) async throws -> T {
        lastRequestPath = path
        lastRequestMethod = "DELETE"

        if let error = mockError {
            throw error
        }

        guard let response = mockResponse as? T else {
            throw URLError(.badServerResponse)
        }

        return response
    }
}
