import BayitNetworking
import Foundation

// MARK: - API Models

struct TVTourStateBody: Encodable, Sendable {
    let platform: String
    let current_card_index: Int?
    let card_viewed: String?
}

struct TVTourCompleteBody: Encodable, Sendable {
    let platform: String
    let tour_version: Int
    let preferences: TourPrefs?
}

struct TVTourSkipBody: Encodable, Sendable {
    let platform: String
    let last_card_viewed: String?
}

struct TVEmptyResponse: Decodable, Sendable {}

/// Backend sync for the tvOS feature tour.
extension TVFeatureTourViewModel {
    func syncWithServer() async {
        struct TourStateResponse: Decodable, Sendable {
            let status: String?
            let tour_version: Int?
        }
        guard let response = try? await apiClient.get(
            "onboarding/tour/state",
            as: TourStateResponse.self
        ) else { return }

        if response.status == "completed", completionStatus == "not_started" {
            completionStatus = "completed"
            persistLocalState()
        }
        if let serverVersion = response.tour_version {
            lastSeenVersion = serverVersion
        }
    }

    func syncState() {
        persistLocalState()
        Task {
            let body = TVTourStateBody(
                platform: platform,
                current_card_index: currentIndex,
                card_viewed: currentCard?.featureKey
            )
            _ = try? await apiClient.put(
                "onboarding/tour/state",
                body: body,
                as: TVEmptyResponse.self
            )
        }
    }

    func syncComplete() async {
        let body = TVTourCompleteBody(
            platform: platform,
            tour_version: Self.currentTourVersion,
            preferences: nil
        )
        _ = try? await apiClient.post(
            "onboarding/tour/complete",
            body: body,
            as: TVEmptyResponse.self
        )
    }

    func syncSkip() async {
        let body = TVTourSkipBody(
            platform: platform,
            last_card_viewed: currentCard?.featureKey
        )
        _ = try? await apiClient.post(
            "onboarding/tour/skip",
            body: body,
            as: TVEmptyResponse.self
        )
    }
}
