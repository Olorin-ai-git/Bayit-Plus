import BayitNetworking
import Foundation

protocol AvatarOutfitRepository: Sendable {

    func getWardrobe(avatarId: String) async throws -> [Outfit]

    func getOwnedOutfits(profileId: String, avatarId: String) async throws -> [Outfit]

    func purchaseOutfit(
        profileId: String, avatarId: String,
        outfitId: String, priceShekel: Int
    ) async throws

    func equipOutfit(
        profileId: String, avatarId: String, outfitId: String
    ) async throws

    func unequipOutfit(
        profileId: String, avatarId: String, outfitId: String
    ) async throws
}

final class APIAvatarOutfitRepository: AvatarOutfitRepository, @unchecked Sendable {

    private let client: APIClient

    init(client: APIClient) {
        self.client = client
    }

    func getWardrobe(avatarId: String) async throws -> [Outfit] {
        let response: OutfitListResponse = try await client.get(
            "/api/v1/avatar-outfits/catalog",
            queryItems: [URLQueryItem(name: "avatar_id", value: avatarId)],
            as: OutfitListResponse.self
        )
        return response.outfits
    }

    func getOwnedOutfits(profileId: String, avatarId: String) async throws -> [Outfit] {
        let response: OutfitInventoryResponse = try await client.get(
            "/api/v1/avatar-outfits/avatars/\(avatarId)/inventory",
            queryItems: [URLQueryItem(name: "profile_id", value: profileId)],
            as: OutfitInventoryResponse.self
        )
        return response.outfits
    }

    func purchaseOutfit(
        profileId: String, avatarId: String,
        outfitId: String, priceShekel: Int
    ) async throws {
        struct PurchaseRequest: Encodable {
            let profileId: String
            let outfitId: String
        }
        let request = PurchaseRequest(profileId: profileId, outfitId: outfitId)
        let _: EmptyOutfitResponse = try await client.post(
            "/api/v1/avatar-outfits/avatars/\(avatarId)/purchase",
            body: request,
            as: EmptyOutfitResponse.self
        )
    }

    func equipOutfit(
        profileId: String, avatarId: String, outfitId: String
    ) async throws {
        struct EquipRequest: Encodable {
            let profileId: String
            let outfitId: String
        }
        let request = EquipRequest(profileId: profileId, outfitId: outfitId)
        let _: EmptyOutfitResponse = try await client.post(
            "/api/v1/avatar-outfits/avatars/\(avatarId)/equip",
            body: request,
            as: EmptyOutfitResponse.self
        )
    }

    func unequipOutfit(
        profileId: String, avatarId: String, outfitId: String
    ) async throws {
        struct UnequipRequest: Encodable {
            let profileId: String
        }
        let request = UnequipRequest(profileId: profileId)
        let _: EmptyOutfitResponse = try await client.post(
            "/api/v1/avatar-outfits/avatars/\(avatarId)/unequip",
            body: request,
            as: EmptyOutfitResponse.self
        )
    }
}

private struct EmptyOutfitResponse: Decodable {}

private struct OutfitListResponse: Decodable {
    let outfits: [Outfit]
}

private struct OutfitInventoryResponse: Decodable {
    let outfits: [Outfit]
    let activeOutfitId: String?
    let totalOwned: Int?
}
