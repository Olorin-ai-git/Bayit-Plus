import BayitCore
import Foundation
import Observation

/// ViewModel for the Widgets screen - manages system widget gallery and user widgets
@Observable
final class WidgetsViewModel {
    private(set) var myWidgets: [WidgetItem] = []
    private(set) var availableWidgets: [AvailableSystemWidget] = []
    private(set) var isLoadingMyWidgets = false
    private(set) var isLoadingGallery = false
    private(set) var myWidgetsError: String?
    private(set) var galleryError: String?
    private(set) var actionLoadingIds: Set<String> = []
    var isDockVisible = true

    /// Total count of user's active widgets
    var totalWidgetCount: Int { myWidgets.count }

    private let repository: any WidgetRepository
    private let logger = BayitLogger(category: "Widgets")

    init(repository: any WidgetRepository) {
        self.repository = repository
    }

    /// Load both user widgets and system gallery concurrently
    @MainActor
    func loadAll() async {
        await withTaskGroup(of: Void.self) { group in
            group.addTask { await self.loadMyWidgets() }
            group.addTask { await self.loadGallery() }
        }
    }

    /// Refresh all widget data
    @MainActor
    func refresh() async {
        myWidgetsError = nil
        galleryError = nil
        await loadAll()
    }

    /// Add a system widget to the user's dock
    @MainActor
    func addSystemWidget(widgetId: String) async {
        guard !actionLoadingIds.contains(widgetId) else { return }
        actionLoadingIds.insert(widgetId)

        do {
            _ = try await repository.addSystemWidget(widgetId: widgetId)
            updateAvailableWidgetStatus(widgetId: widgetId, isAdded: true)
            await loadMyWidgets()
            logger.info("Added system widget: \(widgetId)")
        } catch {
            logger.error("Failed to add system widget: \(error.localizedDescription)")
        }

        actionLoadingIds.remove(widgetId)
    }

    /// Remove a system widget from the user's dock
    @MainActor
    func removeSystemWidget(widgetId: String) async {
        guard !actionLoadingIds.contains(widgetId) else { return }
        actionLoadingIds.insert(widgetId)

        do {
            _ = try await repository.removeSystemWidget(widgetId: widgetId)
            myWidgets.removeAll { $0.systemWidgetId == widgetId }
            updateAvailableWidgetStatus(widgetId: widgetId, isAdded: false)
            logger.info("Removed system widget: \(widgetId)")
        } catch {
            logger.error("Failed to remove system widget: \(error.localizedDescription)")
        }

        actionLoadingIds.remove(widgetId)
    }

    // MARK: - Private

    @MainActor
    private func loadMyWidgets() async {
        guard !isLoadingMyWidgets else { return }
        isLoadingMyWidgets = true
        myWidgetsError = nil

        do {
            let response = try await repository.fetchMyWidgets()
            myWidgets = response.items
        } catch {
            myWidgetsError = error.localizedDescription
            logger.error("Failed to load widgets: \(error.localizedDescription)")
        }

        isLoadingMyWidgets = false
    }

    @MainActor
    private func loadGallery() async {
        guard !isLoadingGallery else { return }
        isLoadingGallery = true
        galleryError = nil

        do {
            let response = try await repository.fetchAvailableSystemWidgets()
            availableWidgets = response.items
        } catch {
            galleryError = error.localizedDescription
            logger.error("Failed to load gallery: \(error.localizedDescription)")
        }

        isLoadingGallery = false
    }

    /// Update the `isAdded` status in the available widgets array after an add/remove action
    @MainActor
    private func updateAvailableWidgetStatus(widgetId: String, isAdded: Bool) {
        guard let index = availableWidgets.firstIndex(where: { $0.id == widgetId }) else { return }
        let existing = availableWidgets[index]
        availableWidgets[index] = AvailableSystemWidget(
            id: existing.id,
            title: existing.title,
            description: existing.description,
            icon: existing.icon,
            coverUrl: existing.coverUrl,
            content: existing.content,
            isAdded: isAdded
        )
    }
}
