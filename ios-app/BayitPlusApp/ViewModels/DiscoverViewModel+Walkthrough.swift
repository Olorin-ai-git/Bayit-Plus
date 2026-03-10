import BayitCore
import Foundation

extension DiscoverViewModel {
    func startWalkthroughSession(for feature: DiscoverFeature) {
        guard !WalkthroughStateMachine.hasCompleted(featureId: feature.id) else {
            return
        }

        let session = WalkthroughSession(feature: feature)
        let manager = WalkthroughSessionManager.shared
        manager.onSessionEnd = { [weak self] featureId, steps, skipped in
            await self?.recordWalkthroughCompletion(
                featureId: featureId,
                stepsCompleted: steps,
                skipped: skipped
            )
        }
        manager.start(session: session)
    }

    func walkthroughURL(for feature: DiscoverFeature) -> URL? {
        let featureConfig = remoteConfig?.features
            .first(where: { $0.featureId == feature.id })

        if let contentId = featureConfig?.walkthroughContentId,
           feature.deepLinkRoute?.hasPrefix("bayitplus://play") == true
        {
            return buildDeepLinkURL(
                scheme: "bayitplus",
                host: "play",
                pathComponent: contentId,
                walkthroughId: feature.id
            )
        }

        if let route = feature.deepLinkRoute,
           let baseURL = URL(string: route)
        {
            var components = URLComponents(url: baseURL, resolvingAgainstBaseURL: false)
            var items = components?.queryItems ?? []
            items.append(URLQueryItem(name: "walkthrough", value: feature.id))
            components?.queryItems = items
            return components?.url
        }

        return nil
    }

    private func buildDeepLinkURL(
        scheme: String,
        host: String,
        pathComponent: String,
        walkthroughId: String
    ) -> URL? {
        var components = URLComponents()
        components.scheme = scheme
        components.host = host
        components.path = "/\(pathComponent)"
        components.queryItems = [URLQueryItem(name: "walkthrough", value: walkthroughId)]
        return components.url
    }
}
