import BayitCore
import Foundation

extension DiscoverViewModel {
    func startWalkthroughSession(for feature: DiscoverFeature) {
        guard !WalkthroughStateMachine.hasCompleted(featureId: feature.id) else {
            return
        }

        let session = WalkthroughSession(feature: feature)
        WalkthroughSessionManager.shared.start(session: session)
    }

    func walkthroughURL(for feature: DiscoverFeature) -> URL? {
        let featureConfig = remoteConfig?.features
            .first(where: { $0.featureId == feature.id })

        if let contentId = featureConfig?.walkthroughContentId,
           feature.deepLinkRoute?.hasPrefix("bayitplus://play") == true
        {
            return URL(string: "bayitplus://play/\(contentId)?walkthrough=\(feature.id)")
        }

        if let route = feature.deepLinkRoute {
            return URL(string: "\(route)?walkthrough=\(feature.id)")
        }

        return nil
    }
}
