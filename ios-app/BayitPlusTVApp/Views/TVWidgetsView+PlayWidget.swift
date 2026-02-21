#if os(tvOS)
    import BayitDesignSystem
    import SwiftUI

    // MARK: - Play Widget Navigation

    extension TVWidgetsView {
        func playWidget(_ widget: WidgetItem) {
            guard let content = widget.content, let contentType = content.contentType else { return }
            switch contentType {
            case .liveChannel, .live:
                if let channelId = content.liveChannelId {
                    coordinator.presentPlayer(contentId: channelId, contentType: .liveTV, channelId: channelId)
                }
            case .radio:
                if let stationId = content.stationId {
                    coordinator.presentPlayer(contentId: stationId, contentType: .radio)
                }
            case .vod:
                if let contentId = content.contentId {
                    coordinator.presentPlayer(contentId: contentId, contentType: .vod)
                }
            case .podcast:
                if let podcastId = content.podcastId {
                    coordinator.fullscreenRoute = .podcastDetail(showId: podcastId)
                }
            case .audiobook:
                if let audiobookId = content.audiobookId ?? content.contentId {
                    coordinator.fullscreenRoute = .audiobookDetail(audiobookId: audiobookId)
                }
            case .iframe, .custom:
                break
            }
        }
    }
#endif
