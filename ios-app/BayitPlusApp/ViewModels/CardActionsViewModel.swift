import BayitCore
import Foundation
import Observation

/// Manages playlist and widget toggle state for content cards.
/// Shared across iOS and tvOS. Each card creates its own instance
/// or a parent can batch-check states for multiple items.
@MainActor
@Observable
final class CardActionsViewModel {

    private(set) var playlistStates: [String: Bool] = [:]
    private(set) var widgetStates: [String: Bool] = [:]
    private(set) var loadingIds: Set<String> = []

    private let userRepository: any UserRepository
    private let widgetRepository: any WidgetRepository
    private let logger = BayitLogger(category: "CardActions")

    init(userRepository: any UserRepository, widgetRepository: any WidgetRepository) {
        self.userRepository = userRepository
        self.widgetRepository = widgetRepository
    }

    // MARK: - State Queries

    func isInPlaylist(_ contentId: String) -> Bool {
        playlistStates[contentId] ?? false
    }

    func isWidget(_ contentId: String) -> Bool {
        widgetStates[contentId] ?? false
    }

    func isLoading(_ contentId: String) -> Bool {
        loadingIds.contains(contentId)
    }

    // MARK: - Playlist Toggle

    func togglePlaylist(contentId: String, contentType: String) async {
        let key = contentId
        guard !loadingIds.contains(key) else { return }
        loadingIds.insert(key)

        let wasInPlaylist = playlistStates[contentId] ?? false
        playlistStates[contentId] = !wasInPlaylist

        do {
            let request = PlaylistToggleRequest(contentType: contentType)
            let response = try await userRepository.togglePlaylistItem(
                contentId: contentId, request: request
            )
            playlistStates[contentId] = response.inPlaylist ?? !wasInPlaylist
            logger.info("Playlist toggled", context: [
                "contentId": contentId,
                "inPlaylist": "\(playlistStates[contentId] ?? false)"
            ])
        } catch {
            playlistStates[contentId] = wasInPlaylist
            logger.error("Playlist toggle failed", error: error)
        }

        loadingIds.remove(key)
    }

    // MARK: - Widget Toggle

    func toggleWidget(
        contentId: String, contentType: String,
        title: String?, thumbnail: String?
    ) async {
        let key = "\(contentId)-widget"
        guard !loadingIds.contains(key) else { return }
        loadingIds.insert(key)

        let wasWidget = widgetStates[contentId] ?? false
        widgetStates[contentId] = !wasWidget

        do {
            let request = WidgetToggleRequest(
                contentType: contentType,
                contentId: contentId,
                title: title,
                description: nil,
                icon: nil,
                coverUrl: thumbnail
            )
            let response = try await widgetRepository.toggleWidget(request)
            widgetStates[contentId] = response.isWidget ?? !wasWidget
            logger.info("Widget toggled", context: [
                "contentId": contentId,
                "isWidget": "\(widgetStates[contentId] ?? false)"
            ])
        } catch {
            widgetStates[contentId] = wasWidget
            logger.error("Widget toggle failed", error: error)
        }

        loadingIds.remove(key)
    }

    // MARK: - Batch Check

    func checkStates(for items: [(contentId: String, contentType: String)]) async {
        await withTaskGroup(of: Void.self) { group in
            group.addTask { await self.batchCheckPlaylist(items: items) }
            group.addTask { await self.batchCheckWidgets(items: items) }
        }
    }

    private func batchCheckPlaylist(items: [(contentId: String, contentType: String)]) async {
        for item in items {
            do {
                let response = try await userRepository.checkPlaylistItem(contentId: item.contentId)
                playlistStates[item.contentId] = response.inPlaylist ?? false
            } catch {
                // Non-fatal
            }
        }
    }

    private func batchCheckWidgets(items: [(contentId: String, contentType: String)]) async {
        let checkItems = items.map {
            WidgetCheckItem(contentType: $0.contentType, contentId: $0.contentId)
        }
        do {
            let response = try await widgetRepository.checkWidgetBatch(checkItems)
            for result in response.items ?? [] {
                if let id = result.contentId {
                    widgetStates[id] = result.isWidget ?? false
                }
            }
        } catch {
            // Non-fatal
        }
    }
}
