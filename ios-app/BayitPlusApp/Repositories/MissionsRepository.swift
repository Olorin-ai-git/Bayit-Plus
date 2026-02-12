import BayitNetworking
import Foundation

protocol MissionsRepository: Sendable {

    func fetchDailyMissions() async throws -> DailyMissionsResponse

    func claimMission(missionId: String) async throws -> ClaimMissionResponse

    func fetchWalletBalance() async throws -> ShekelsWalletResponse

    func fetchLeaderboard(
        scope: LeaderboardScope,
        period: LeaderboardPeriod
    ) async throws -> LeaderboardResponse

    func fetchAvailableCoupons() async throws -> CouponsResponse

    func redeemCoupon(couponId: String) async throws -> RedeemCouponResponse

    func fetchZines() async throws -> ZineListResponse

    func markZineViewed(zineId: String) async throws
}

final class APIMissionsRepository: MissionsRepository, @unchecked Sendable {

    private let client: APIClient

    init(client: APIClient) {
        self.client = client
    }

    func fetchDailyMissions() async throws -> DailyMissionsResponse {
        return try await client.get(
            "/api/v1/missions/daily",
            as: DailyMissionsResponse.self
        )
    }

    func claimMission(missionId: String) async throws -> ClaimMissionResponse {
        let request = ClaimMissionRequest(missionId: missionId)
        return try await client.post(
            "/api/v1/missions/claim",
            body: request,
            as: ClaimMissionResponse.self
        )
    }

    func fetchWalletBalance() async throws -> ShekelsWalletResponse {
        return try await client.get(
            "/api/v1/shekels/wallet",
            as: ShekelsWalletResponse.self
        )
    }

    func fetchLeaderboard(
        scope: LeaderboardScope,
        period: LeaderboardPeriod
    ) async throws -> LeaderboardResponse {
        let queryItems = [
            URLQueryItem(name: "scope", value: scope.rawValue),
            URLQueryItem(name: "period", value: period.rawValue)
        ]

        return try await client.get(
            "/api/v1/leaderboard",
            queryItems: queryItems,
            as: LeaderboardResponse.self
        )
    }

    func fetchAvailableCoupons() async throws -> CouponsResponse {
        return try await client.get(
            "/api/v1/coupons/available",
            as: CouponsResponse.self
        )
    }

    func redeemCoupon(couponId: String) async throws -> RedeemCouponResponse {
        let request = RedeemCouponRequest(couponId: couponId)
        return try await client.post(
            "/api/v1/coupons/redeem",
            body: request,
            as: RedeemCouponResponse.self
        )
    }

    func fetchZines() async throws -> ZineListResponse {
        return try await client.get(
            "/api/v1/zine",
            as: ZineListResponse.self
        )
    }

    func markZineViewed(zineId: String) async throws {
        let _: EmptyResponse = try await client.patch(
            "/api/v1/zine/\(zineId)/viewed",
            as: EmptyResponse.self
        )
    }
}

private struct EmptyResponse: Decodable {}
