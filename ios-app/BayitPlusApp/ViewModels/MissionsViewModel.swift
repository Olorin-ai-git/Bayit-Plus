import BayitCore
import Foundation
import Observation

@MainActor
@Observable
final class MissionsViewModel {
    private(set) var missions: [DailyMission] = []
    private(set) var totalAvailableShekels = 0
    private(set) var missionDate: String = ""
    private(set) var walletBalance: ShekelsBalance?
    private(set) var recentTransactions: [ShekelsTransaction] = []
    private(set) var leaderboardUsers: [LeaderboardUser] = []
    private(set) var currentUserRank: LeaderboardUser?
    private(set) var isLoading = false
    private(set) var isRefreshing = false
    private(set) var isClaimingMissionId: String?
    private(set) var errorMessage: String?

    private(set) var availableCoupons: [Coupon] = []
    private(set) var isRedeemingCouponId: String?
    private(set) var lastRedemptionCode: String?

    private(set) var currentZine: WeeklyZine?
    private(set) var zineArchive: [WeeklyZine] = []

    private let repository: any MissionsRepository
    private let logger = BayitLogger(category: "MissionsViewModel")

    var selectedLeaderboardScope: LeaderboardScope = .global
    var selectedLeaderboardPeriod: LeaderboardPeriod = .weekly

    init(repository: any MissionsRepository) {
        self.repository = repository
    }

    func fetchDailyMissions() async {
        guard !isLoading else { return }
        isLoading = true
        errorMessage = nil

        do {
            let response = try await repository.fetchDailyMissions()
            missions = response.missions
            totalAvailableShekels = response.totalAvailableShekels
            missionDate = response.date
            logger.info("Fetched \(missions.count) daily missions")
        } catch {
            errorMessage = error.localizedDescription
            logger.error("Failed to fetch daily missions", error: error)
        }

        isLoading = false
    }

    func refreshMissions() async {
        isRefreshing = true
        await fetchDailyMissions()
        isRefreshing = false
    }

    func claimMission(id: String) async {
        guard isClaimingMissionId == nil else { return }
        isClaimingMissionId = id
        errorMessage = nil

        do {
            let response = try await repository.claimMission(missionId: id)
            if response.success {
                if let index = missions.firstIndex(where: { $0.id == id }) {
                    var updatedMission = missions[index]
                    missions[index] = DailyMission(
                        id: updatedMission.id,
                        type: updatedMission.type,
                        title: updatedMission.title,
                        description: updatedMission.description,
                        iconName: updatedMission.iconName,
                        targetValue: updatedMission.targetValue,
                        currentValue: updatedMission.currentValue,
                        rewardShekels: updatedMission.rewardShekels,
                        isCompleted: updatedMission.isCompleted,
                        isClaimed: true,
                        expiresAt: updatedMission.expiresAt
                    )
                }
                await fetchWalletBalance()
                logger.info("Claimed mission \(id), earned \(response.earnedShekels) shekels")
            }
        } catch {
            errorMessage = error.localizedDescription
            logger.error("Failed to claim mission \(id)", error: error)
        }

        isClaimingMissionId = nil
    }

    func fetchWalletBalance() async {
        errorMessage = nil

        do {
            let response = try await repository.fetchWalletBalance()
            walletBalance = response.balance
            recentTransactions = response.recentTransactions
            logger.info("Fetched wallet balance: \(response.balance.balance)")
        } catch {
            errorMessage = error.localizedDescription
            logger.error("Failed to fetch wallet balance", error: error)
        }
    }

    func fetchLeaderboard() async {
        errorMessage = nil

        do {
            let response = try await repository.fetchLeaderboard(
                scope: selectedLeaderboardScope,
                period: selectedLeaderboardPeriod
            )
            leaderboardUsers = response.users
            currentUserRank = response.currentUserRank
            logger.info("Fetched leaderboard: \(leaderboardUsers.count) users")
        } catch {
            errorMessage = error.localizedDescription
            logger.error("Failed to fetch leaderboard", error: error)
        }
    }

    func fetchCoupons() async {
        errorMessage = nil
        do {
            let response = try await repository.fetchAvailableCoupons()
            availableCoupons = response.coupons
            logger.info("Fetched \(availableCoupons.count) coupons")
        } catch {
            errorMessage = error.localizedDescription
            logger.error("Failed to fetch coupons", error: error)
        }
    }

    func redeemCoupon(id: String) async {
        guard isRedeemingCouponId == nil else { return }
        isRedeemingCouponId = id
        lastRedemptionCode = nil
        errorMessage = nil

        do {
            let response = try await repository.redeemCoupon(couponId: id)
            if response.success {
                lastRedemptionCode = response.redemptionCode
                availableCoupons.removeAll { $0.id == id }
                await fetchWalletBalance()
                logger.info("Redeemed coupon \(id)")
            }
        } catch {
            errorMessage = error.localizedDescription
            logger.error("Failed to redeem coupon \(id)", error: error)
        }

        isRedeemingCouponId = nil
    }

    func fetchZines() async {
        errorMessage = nil
        do {
            let response = try await repository.fetchZines()
            currentZine = response.current
            zineArchive = response.archive
            logger.info("Fetched zines: current=\(currentZine != nil), archive=\(zineArchive.count)")
        } catch {
            errorMessage = error.localizedDescription
            logger.error("Failed to fetch zines", error: error)
        }
    }

    func markZineViewed(id: String) async {
        do {
            try await repository.markZineViewed(zineId: id)
            if currentZine?.id == id {
                // Refetch to update viewed status
                await fetchZines()
            }
            logger.info("Marked zine \(id) as viewed")
        } catch {
            logger.error("Failed to mark zine viewed", error: error)
        }
    }
}
