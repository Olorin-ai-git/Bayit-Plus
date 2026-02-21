import AVFoundation
import BayitDesignSystem
import BayitLocalization
import BayitMedia
import SwiftUI

// MARK: - PiPWidgetContainerView Content Area

extension PiPWidgetContainerView {
    @ViewBuilder
    var contentArea: some View {
        let contentType = widget.content?.contentType
        Group {
            switch contentType {
            case .liveChannel, .live:
                liveContentView
            case .radio:
                radioContentView
            case .podcast:
                podcastContentView
            case .vod:
                vodContentView
            case .iframe:
                iframeContentView
            case .audiobook:
                audiobookContentView
            case .custom:
                customContentView
            case nil:
                placeholderView
            }
        }
        .frame(height: contentHeight(for: contentType))
        .background(Color.black.opacity(0.85))
        .background(.ultraThinMaterial.opacity(0.3))
    }

    func contentHeight(for type: WidgetContentType?) -> CGFloat {
        switch type {
        case .liveChannel, .live, .vod:
            return 200
        case .radio, .podcast, .audiobook:
            return 140
        case .iframe, .custom:
            return 220
        case nil:
            return 120
        }
    }
}
