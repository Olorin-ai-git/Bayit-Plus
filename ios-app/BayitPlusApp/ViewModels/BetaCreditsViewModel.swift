import Foundation
import Observation

/// ViewModel for the Beta 500 Credits feature - manages credit balance,
/// auto-refresh, and deduction operations.
@MainActor
@Observable
final class BetaCreditsViewModel {
    private(set) var balance: CreditBalance?
    private(set) var isLoading = false
    private(set) var error: String?
    private(set) var isDeducting = false

    private let repository: any BetaCreditsRepository
    nonisolated(unsafe) private var refreshTimer: Timer?

    private static let refreshIntervalSeconds: TimeInterval = 30

    init(repository: any BetaCreditsRepository) {
        self.repository = repository
    }

    deinit {
        stopAutoRefresh()
    }

    // MARK: - Data Loading

    @MainActor
    func loadBalance() async {
        guard !isLoading else { return }
        isLoading = true
        error = nil

        do {
            balance = try await repository.fetchBalance()
        } catch {
            if let message = error.userFriendlyMessage {
                self.error = message
            }
        }

        isLoading = false
    }

    // MARK: - Credit Deduction

    @MainActor
    func deductCredits(amount: Int, reason: String) async {
        isDeducting = true
        error = nil

        do {
            let request = CreditDeductRequest(amount: amount, reason: reason)
            balance = try await repository.deductCredits(request)
        } catch {
            if let message = error.userFriendlyMessage {
                self.error = message
            }
        }

        isDeducting = false
    }

    // MARK: - Auto Refresh

    @MainActor
    func startAutoRefresh() {
        stopAutoRefresh()
        refreshTimer = Timer.scheduledTimer(
            withTimeInterval: Self.refreshIntervalSeconds,
            repeats: true
        ) { [weak self] _ in
            guard let self else { return }
            Task { @MainActor in
                await self.loadBalance()
            }
        }
    }

    nonisolated func stopAutoRefresh() {
        refreshTimer?.invalidate()
        refreshTimer = nil
    }

    // MARK: - Computed Properties

    var progressPercentage: Double {
        guard let balance,
              let total = balance.totalCredits, total > 0,
              let remaining = balance.remainingCredits else {
            return 0
        }
        return Double(remaining) / Double(total)
    }

    var statusColor: StatusColor {
        guard let balance else { return .green }
        if balance.isCritical == true { return .red }
        if balance.isLow == true { return .amber }
        return .green
    }

    var isDepleted: Bool {
        balance?.remainingCredits == 0
    }

    enum StatusColor {
        case green
        case amber
        case red
    }
}
