import BayitNetworking
import Foundation

protocol FamilySnapRepository: Sendable {

    func getSnaps(profileId: String, avatarId: String) async throws -> [FamilySnap]
}

final class APIFamilySnapRepository: FamilySnapRepository, @unchecked Sendable {

    private let client: APIClient

    init(client: APIClient) {
        self.client = client
    }

    func getSnaps(profileId: String, avatarId: String) async throws -> [FamilySnap] {
        let queryItems = [
            URLQueryItem(name: "profile_id", value: profileId)
        ]
        return try await client.get(
            "/api/v1/family-snaps/avatars/\(avatarId)/snaps",
            queryItems: queryItems,
            as: [FamilySnap].self
        )
    }
}
