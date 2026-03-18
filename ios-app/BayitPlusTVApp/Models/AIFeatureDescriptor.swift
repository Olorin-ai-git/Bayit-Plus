#if os(tvOS)
    import Foundation

    /// How a feature charges AI credits.
    enum CreditChargeModel: Sendable {
        /// Fixed cost deducted once per use.
        case oneTime(cost: Double)
        /// Continuous drain: pre-authorizes a block of credits.
        /// `minimumBlock` is the floor; adaptive sizing uses 25% of balance.
        case blockBased(ratePerSecond: Double, minimumBlock: Int)
    }

    /// Describes an AI feature for the unified credit confirmation dialog.
    struct AIFeatureDescriptor: Sendable {
        let featureKey: String
        let iconSystemName: String
        let localeKeyPrefix: String
        let chargeModel: CreditChargeModel
    }

    // MARK: - Feature Registry

    extension AIFeatureDescriptor {
        static let liveDubbing = AIFeatureDescriptor(
            featureKey: "live_dubbing",
            iconSystemName: "waveform.badge.mic",
            localeKeyPrefix: "ai.confirm.dubbing",
            chargeModel: .blockBased(ratePerSecond: 1.0, minimumBlock: 60)
        )

        static let subtitleGeneration = AIFeatureDescriptor(
            featureKey: "subtitle_generation",
            iconSystemName: "sparkles",
            localeKeyPrefix: "ai.confirm.subtitle",
            chargeModel: .oneTime(cost: 15.0)
        )

        static let catchUpSummary = AIFeatureDescriptor(
            featureKey: "catchup_summary",
            iconSystemName: "clock.arrow.circlepath",
            localeKeyPrefix: "ai.confirm.catchup",
            chargeModel: .oneTime(cost: 1.0)
        )
    }

    // MARK: - Cost Computation

    extension AIFeatureDescriptor {
        /// Computes the effective credit cost given the user's remaining balance.
        func effectiveCost(remainingBalance: Int) -> Double {
            switch chargeModel {
            case let .oneTime(cost):
                return cost
            case let .blockBased(ratePerSecond, minimumBlock):
                let adaptiveBlock = Double(remainingBalance) * 0.25
                let block = max(Double(minimumBlock), adaptiveBlock)
                return min(block, Double(remainingBalance)) * ratePerSecond
            }
        }
    }
#endif
