#if os(tvOS)
    import BayitDesignSystem
    import SwiftUI

    // MARK: - Badge Color Helper

    func widgetBadgeColor(for widget: WidgetItem) -> Color {
        switch widget.content?.contentType {
        case .liveChannel, .live: return DesignTokens.Primary.p400
        case .radio: return DesignTokens.Warning.default
        case .podcast: return DesignTokens.Success.default
        case .vod, .audiobook: return DesignTokens.Primary.p300
        case .iframe: return DesignTokens.Text.secondary
        default: return DesignTokens.Text.muted
        }
    }

#endif
