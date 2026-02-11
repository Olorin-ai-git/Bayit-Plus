import Foundation
import Observation

/// ViewModel for the Rewards / Gamification screen - fetches reward
/// balance, badges, and level progress.
@MainActor
@Observable
final class RewardsViewModel {
    private(set) var balance: RewardBalance?
    private(set) var badges: [Badge] = []
    private(set) var isLoading = false
    private(set) var error: String?

    private let repository: any RewardRepository

    init(repository: any RewardRepository) {
        self.repository = repository
    }

    @MainActor
    func load() async {
        guard !isLoading else { return }
        isLoading = true
        error = nil

        do {
            async let balanceResult = repository.fetchBalance()
            async let badgesResult = repository.fetchBadges()
            balance = try await balanceResult
            badges = try await badgesResult
        } catch {
            self.error = error.localizedDescription
        }

        isLoading = false
    }

    // MARK: - Computed Properties

    var points: Int {
        balance?.points ?? 0
    }

    var level: Int {
        balance?.level ?? 1
    }

    var streakDays: Int {
        balance?.streakDays ?? 0
    }

    /// Level progress as a fraction 0..1 based on points within the current level.
    /// Each level requires levelThreshold points.
    var levelProgress: Double {
        let levelThreshold = 100
        guard levelThreshold > 0 else { return 0 }
        let pointsInLevel = points % levelThreshold
        return Double(pointsInLevel) / Double(levelThreshold)
    }
}
