import BayitCore
import Foundation
import Observation

@MainActor
@Observable
final class DiscoverViewModel {
    private let repository: any DiscoverRepository
    private let availabilityService: any FeatureAvailabilityChecking
    private let logger = BayitLogger(category: "DiscoverViewModel")

    private(set) var isLoading = false
    private(set) var remoteConfig: DiscoverConfigResponse?
    private(set) var availabilityStates: [String: FeatureAvailabilityState] = [:]
    var expandedFeatureId: String?
    var pendingDemoVideoURL: URL?

    var categories: [DiscoverCategory] {
        DiscoverCategory.allCases.sorted { $0.sortOrder < $1.sortOrder }
    }

    init(
        repository: any DiscoverRepository,
        availabilityService: any FeatureAvailabilityChecking
    ) {
        self.repository = repository
        self.availabilityService = availabilityService
    }

    func loadConfig() async {
        guard !isLoading else { return }
        isLoading = true
        defer { isLoading = false }

        do {
            remoteConfig = try await repository.fetchConfig()
        } catch {
            logger.warning(
                "Remote config unavailable, using catalog defaults",
                context: ["error": error.localizedDescription]
            )
        }

        await refreshAvailability()
    }

    func refreshAvailability() async {
        for feature in DiscoverFeatureCatalog.allFeatures {
            let state = await availabilityService.checkAvailability(for: feature)
            availabilityStates[feature.id] = state
        }
    }

    func features(for category: DiscoverCategory) -> [DiscoverFeature] {
        let categoryFeatures = DiscoverFeatureCatalog.features(for: category)
        guard let config = remoteConfig else { return categoryFeatures }
        return categoryFeatures.filter { feature in
            config.features.first { $0.featureId == feature.id }?.enabled ?? true
        }
    }

    func availability(for featureId: String) -> FeatureAvailabilityState {
        availabilityStates[featureId] ?? .ready
    }

    func toggleExpanded(featureId: String) {
        if expandedFeatureId == featureId {
            expandedFeatureId = nil
        } else {
            expandedFeatureId = featureId
        }
    }

    func demoVideoURL(for featureId: String) -> URL? {
        guard let urlString = remoteConfig?.features
            .first(where: { $0.featureId == featureId })?.demoVideoUrl
        else { return nil }
        return URL(string: urlString)
    }

    func demoThumbnailURL(for featureId: String) -> URL? {
        guard let urlString = remoteConfig?.features
            .first(where: { $0.featureId == featureId })?.demoThumbnailUrl
        else { return nil }
        return URL(string: urlString)
    }

    func recordWalkthroughCompletion(featureId: String, stepsCompleted: Int, skipped: Bool) async {
        do {
            try await repository.recordWalkthroughComplete(
                featureId: featureId,
                stepsCompleted: stepsCompleted,
                skipped: skipped
            )
        } catch {
            logger.warning(
                "Failed to record walkthrough completion",
                context: ["featureId": featureId, "error": error.localizedDescription]
            )
        }
    }
}
