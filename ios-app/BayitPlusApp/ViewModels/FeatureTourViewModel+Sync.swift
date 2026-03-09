import BayitAnalytics
import BayitNetworking
import Foundation

// MARK: - API Models

struct TourStateBody: Encodable, Sendable {
    let platform: String
    let current_card_index: Int?
    let card_viewed: String?
}

struct TourCompleteBody: Encodable, Sendable {
    let platform: String
    let tour_version: Int
    let preferences: TourPrefs?
}

struct TourPrefs: Encodable, Sendable {
    let content_languages: [String]?
    let genres: [String]?
    let has_children: Bool?
}

struct TourSkipBody: Encodable, Sendable {
    let platform: String
    let last_card_viewed: String?
}

struct TourStateResponse: Decodable, Sendable {
    let status: String?
    let tour_version: Int?
}

struct EmptyTourResponse: Decodable, Sendable {}

/// Backend sync and cross-device state resolution for the tour.
extension FeatureTourViewModel {
    func syncWithServer() async {
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
            let body = TourStateBody(
                platform: platform,
                current_card_index: currentIndex,
                card_viewed: currentCard?.featureKey
            )
            _ = try? await apiClient.put(
                "onboarding/tour/state",
                body: body,
                as: EmptyTourResponse.self
            )
        }
    }

    func syncComplete(preferences: [String: Any]?) async {
        let prefs = TourPrefs(
            content_languages: preferences?["content_languages"] as? [String],
            genres: preferences?["genres"] as? [String],
            has_children: preferences?["has_children"] as? Bool
        )
        let body = TourCompleteBody(
            platform: platform,
            tour_version: Self.currentTourVersion,
            preferences: prefs
        )
        _ = try? await apiClient.post(
            "onboarding/tour/complete",
            body: body,
            as: EmptyTourResponse.self
        )
    }

    func syncSkip() async {
        let body = TourSkipBody(
            platform: platform,
            last_card_viewed: currentCard?.featureKey
        )
        _ = try? await apiClient.post(
            "onboarding/tour/skip",
            body: body,
            as: EmptyTourResponse.self
        )
    }
}
