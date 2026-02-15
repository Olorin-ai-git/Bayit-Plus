import XCTest
@testable import BayitPlusApp

final class AvatarMeshRepositoryTests: XCTestCase {

    var repository: AvatarMeshRepository!
    var mockClient: MockAPIClient!

    override func setUp() {
        super.setUp()
        mockClient = MockAPIClient()
        repository = AvatarMeshRepository(apiClient: mockClient)
    }

    override func tearDown() {
        repository = nil
        mockClient = nil
        super.tearDown()
    }

    // MARK: - Mesh Generation Tests

    func testGenerateMeshSuccess() async throws {
        let expectedMesh = AvatarMesh(
            id: "mesh-123",
            avatarId: "avatar-456",
            status: .generating,
            glbUrl: nil,
            blendShapeNames: [],
            source: .arkit,
            createdAt: Date()
        )

        mockClient.mockResponse = expectedMesh

        let result = try await repository.generateMesh(
            avatarId: "avatar-456",
            profileId: "profile-789",
            pin: "123456"
        )

        XCTAssertEqual(result.id, "mesh-123")
        XCTAssertEqual(result.status, .generating)
        XCTAssertEqual(result.source, .arkit)
    }

    func testUploadGLBMeshSuccess() async throws {
        let glbData = Data("fake glb data".utf8)

        mockClient.mockResponse = AvatarMesh(
            id: "mesh-new",
            avatarId: "avatar-123",
            status: .rigging,
            glbUrl: nil,
            blendShapeNames: [],
            source: .arkit,
            createdAt: Date()
        )

        let result = try await repository.uploadGLBMesh(
            avatarId: "avatar-123",
            glbData: glbData,
            blendShapes: ["mouthOpen", "eyeBlink"],
            vertexCount: 5000,
            boneCount: 25
        )

        XCTAssertEqual(result.status, .rigging)
    }

    func testGetMeshStatusReady() async throws {
        mockClient.mockResponse = AvatarMesh(
            id: "mesh-ready",
            avatarId: "avatar-789",
            status: .ready,
            glbUrl: "https://example.com/avatar.glb",
            blendShapeNames: ["mouthOpen", "eyeBlink", "browUp"],
            source: .readyPlayerMe,
            createdAt: Date()
        )

        let result = try await repository.getMeshStatus(avatarId: "avatar-789")

        XCTAssertEqual(result.status, .ready)
        XCTAssertNotNil(result.glbUrl)
        XCTAssertEqual(result.blendShapeNames.count, 3)
    }

    func testDownloadGLBSuccess() async throws {
        let mockGLBData = Data("mock glb content".utf8)
        mockClient.mockDataResponse = mockGLBData

        let data = try await repository.downloadGLB(meshId: "mesh-123")

        XCTAssertEqual(data, mockGLBData)
    }

    func testDeleteMeshSuccess() async throws {
        mockClient.mockResponse = ["success": true]

        try await repository.deleteMesh(meshId: "mesh-to-delete")

        // Should not throw
    }

    // MARK: - Error Handling Tests

    func testGenerateMeshWithInvalidPIN() async {
        mockClient.shouldFail = true
        mockClient.error = NSError(domain: "ZehAni", code: 403, userInfo: [NSLocalizedDescriptionKey: "Invalid PIN"])

        do {
            _ = try await repository.generateMesh(
                avatarId: "avatar-123",
                profileId: "profile-456",
                pin: "000000"
            )
            XCTFail("Should have thrown error")
        } catch {
            XCTAssertEqual((error as NSError).code, 403)
        }
    }

    func testGetMeshStatusNotFound() async {
        mockClient.shouldFail = true
        mockClient.error = NSError(domain: "ZehAni", code: 404, userInfo: [NSLocalizedDescriptionKey: "Mesh not found"])

        do {
            _ = try await repository.getMeshStatus(avatarId: "nonexistent")
            XCTFail("Should have thrown error")
        } catch {
            XCTAssertEqual((error as NSError).code, 404)
        }
    }
}

// MARK: - Mock API Client

class MockAPIClient: APIClient {
    var mockResponse: Any?
    var mockDataResponse: Data?
    var shouldFail = false
    var error: Error?

    override func request<T: Decodable>(_ endpoint: String, method: String = "GET", body: [String: Any]? = nil) async throws -> T {
        if shouldFail {
            throw error ?? NSError(domain: "Test", code: -1)
        }

        if let response = mockResponse as? T {
            return response
        }

        throw NSError(domain: "Test", code: -1, userInfo: [NSLocalizedDescriptionKey: "No mock response set"])
    }

    override func upload<T: Decodable>(_ endpoint: String, data: Data, filename: String) async throws -> T {
        if shouldFail {
            throw error ?? NSError(domain: "Test", code: -1)
        }

        if let response = mockResponse as? T {
            return response
        }

        throw NSError(domain: "Test", code: -1)
    }

    override func download(_ url: String) async throws -> Data {
        if shouldFail {
            throw error ?? NSError(domain: "Test", code: -1)
        }

        return mockDataResponse ?? Data()
    }
}
