#if os(tvOS)
    import Foundation
    import Observation

    /// Presentation coordinator for the unified AI credit confirmation dialog.
    ///
    /// Pure presentation logic -- computes display values and delegates
    /// actual deduction to the caller via callbacks. Does not call backend.
    @MainActor
    @Observable
    final class CreditConfirmationCoordinator {
        // MARK: - State

        enum ConfirmationState {
            case idle
            case showing(
                descriptor: AIFeatureDescriptor,
                effectiveCost: Double,
                currentBalance: Int,
                postDeductionBalance: Double,
                isReauthorization: Bool,
                isInsufficient: Bool
            )
        }

        private(set) var state: ConfirmationState = .idle

        /// Called when user accepts the charge (or taps upgrade if insufficient).
        var onConfirmed: ((AIFeatureDescriptor, Double) -> Void)?
        /// Called when user declines.
        var onDeclined: (() -> Void)?
        /// Called when user taps accept but has insufficient credits.
        var onUpgradeRequested: (() -> Void)?

        // MARK: - Computed

        var isShowing: Bool {
            if case .idle = state { return false }
            return true
        }

        // MARK: - Actions

        func present(feature: AIFeatureDescriptor, balance: CreditBalance) {
            let remaining = balance.remainingCredits ?? 0
            let cost = feature.effectiveCost(remainingBalance: remaining)
            let postDeduction = Double(remaining) - cost
            let insufficient = postDeduction < 0

            state = .showing(
                descriptor: feature,
                effectiveCost: cost,
                currentBalance: remaining,
                postDeductionBalance: postDeduction,
                isReauthorization: false,
                isInsufficient: insufficient
            )
        }

        func presentReauthorization(
            feature: AIFeatureDescriptor,
            balance: CreditBalance
        ) {
            let remaining = balance.remainingCredits ?? 0
            let cost = feature.effectiveCost(remainingBalance: remaining)
            let postDeduction = Double(remaining) - cost
            let insufficient = postDeduction < 0

            state = .showing(
                descriptor: feature,
                effectiveCost: cost,
                currentBalance: remaining,
                postDeductionBalance: postDeduction,
                isReauthorization: true,
                isInsufficient: insufficient
            )
        }

        func accept() {
            guard case let .showing(
                descriptor, effectiveCost, _, _, _, isInsufficient
            ) = state else { return }

            if isInsufficient {
                onUpgradeRequested?()
            } else {
                onConfirmed?(descriptor, effectiveCost)
            }
            dismiss()
        }

        func decline() {
            onDeclined?()
            dismiss()
        }

        func dismiss() {
            state = .idle
        }
    }
#endif
