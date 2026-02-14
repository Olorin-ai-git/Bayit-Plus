import AppIntents
import BayitWidgetShared
import BayitCore

/// App Intent that allows users to select a playlist during widget configuration.
/// This intent is presented when the user adds a Playlist widget to their home screen.
@available(iOS 17.0, *)
struct SelectPlaylistIntent: WidgetConfigurationIntent {
    static var title: LocalizedStringResource = "Select Playlist"
    static var description = IntentDescription("Choose which playlist to display in the widget.")

    /// The selected playlist entity. This provides rich display in the configuration UI.
    @Parameter(title: "Playlist")
    var playlist: PlaylistEntity?

    /// Legacy playlist ID property for backward compatibility.
    var playlistID: String? {
        playlist?.id
    }

    /// Legacy playlist name property for backward compatibility.
    var playlistName: String? {
        playlist?.name
    }
}


/// Entity representing a playlist selection option.
/// This provides better display in the widget configuration UI.
@available(iOS 17.0, *)
struct PlaylistEntity: AppEntity {
    let id: String
    let name: String
    let itemCount: Int

    static var typeDisplayRepresentation: TypeDisplayRepresentation = "Playlist"
    static var defaultQuery = PlaylistEntityQuery()

    var displayRepresentation: DisplayRepresentation {
        DisplayRepresentation(
            title: "\(name)",
            subtitle: "\(itemCount) items"
        )
    }
}

/// Query provider for playlist entities.
@available(iOS 17.0, *)
struct PlaylistEntityQuery: EntityQuery {
    private let logger = BayitLogger(category: "PlaylistEntityQuery")

    func entities(for identifiers: [String]) async throws -> [PlaylistEntity] {
        let playlists = await WidgetDataStore.shared.readPlaylists()
        return playlists
            .filter { identifiers.contains($0.id) }
            .map { playlist in
                PlaylistEntity(
                    id: playlist.id,
                    name: playlist.name,
                    itemCount: playlist.itemCount
                )
            }
    }

    func suggestedEntities() async throws -> [PlaylistEntity] {
        let playlists = await WidgetDataStore.shared.readPlaylists()

        if playlists.isEmpty {
            logger.warning("No playlists available for suggestions")
            return []
        }

        logger.info("Providing \(playlists.count) playlist suggestions")

        return playlists.map { playlist in
            PlaylistEntity(
                id: playlist.id,
                name: playlist.name,
                itemCount: playlist.itemCount
            )
        }
    }

    func defaultResult() async -> PlaylistEntity? {
        guard let first = await WidgetDataStore.shared.readPlaylists().first else {
            return nil
        }
        return PlaylistEntity(
            id: first.id,
            name: first.name,
            itemCount: first.itemCount
        )
    }
}
