import WidgetKit
import SwiftUI
import BayitWidgetShared
import BayitCore

/// Configurable Playlist widget that allows users to select which playlist to display.
/// Available on iOS 17.0+ with AppIntentConfiguration support.
@available(iOS 17.0, *)
struct ConfigurablePlaylistWidget: Widget {
    let kind = WidgetConfigurationKeys.WidgetKind.configurablePlaylist

    var body: some WidgetConfiguration {
        AppIntentConfiguration(
            kind: kind,
            intent: SelectPlaylistIntent.self,
            provider: PlaylistIntentProvider()
        ) { entry in
            PlaylistIntentView(entry: entry)
        }
        .configurationDisplayName("My Playlist")
        .description("Choose a playlist to display and control.")
        .supportedFamilies([.systemSmall, .systemMedium])
        .contentMarginsDisabled()
    }
}
