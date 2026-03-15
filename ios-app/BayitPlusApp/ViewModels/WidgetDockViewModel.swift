import BayitCore
import Foundation
import Observation

/// Lightweight view model for the global floating widget dock.
/// Loads the user's active widgets and manages dock visibility state.
/// Tracks which widgets are minimized (shown in dock) vs restored (shown as floating PiP).
/// Used by MainTabView to render PiPWidgetManagerView across all tabs.
@MainActor
@Observable
final class WidgetDockViewModel {
    private(set) var widgets: [WidgetItem] = []
    private(set) var isLoading = false
    var isDockVisible = true

    /// IDs of widgets that have been restored from the dock (not minimized).
    private(set) var restoredWidgetIds: Set<String> = []

    private let repository: any WidgetRepository
    private let logger = BayitLogger(category: "WidgetDock")
    private var persistTask: Task<Void, Never>?

    init(repository: any WidgetRepository, initiallyVisible: Bool = false) {
        self.repository = repository
        isDockVisible = initiallyVisible
    }

    /// Show the dock explicitly.
    @MainActor
    func showDock() {
        isDockVisible = true
    }

    /// Widgets currently minimized in the dock (excludes restored ones).
    var minimizedWidgets: [WidgetItem] {
        widgets.filter { !restoredWidgetIds.contains($0.id) }
    }

    /// Widgets currently restored as floating PiP windows.
    var restoredWidgets: [WidgetItem] {
        widgets.filter { restoredWidgetIds.contains($0.id) }
    }

    /// Load the user's active widgets for the dock.
    @MainActor
    func loadWidgets() async {
        guard !isLoading else { return }
        isLoading = true

        do {
            let response = try await repository.fetchMyWidgets()
            widgets = response.items.filter { $0.isVisible != false }

            // Don't auto-restore widgets into the floating sidebar on cold launch.
            // The sidebar should only appear when the user explicitly restores a
            // widget from the dock during the current session.
            restoredWidgetIds = []

            // Only show dock if there are widgets sitting in minimized state
            if !isDockVisible {
                isDockVisible = !minimizedWidgets.isEmpty
            }

            logger.info("Loaded \(widgets.count) dock widgets")
        } catch {
            logger.error("Failed to load dock widgets: \(error.localizedDescription)")
        }

        isLoading = false
    }

    /// Toggle a widget between minimized (in dock) and restored (floating PiP).
    @MainActor
    func toggleMinimize(widgetId: String) {
        let isCurrentlyRestored = restoredWidgetIds.contains(widgetId)
        let newIsMinimized = isCurrentlyRestored

        // Optimistic update
        if isCurrentlyRestored {
            restoredWidgetIds.remove(widgetId)
        } else {
            restoredWidgetIds.insert(widgetId)
        }

        // Persist to backend
        persistTask = Task {
            do {
                _ = try await repository.toggleMinimize(
                    widgetId: widgetId,
                    isMinimized: newIsMinimized
                )
            } catch {
                // Revert on failure
                await MainActor.run {
                    if newIsMinimized {
                        restoredWidgetIds.insert(widgetId)
                    } else {
                        restoredWidgetIds.remove(widgetId)
                    }
                }
                logger.error("Failed to toggle minimize: \(error.localizedDescription)")
            }
        }
    }

    /// Minimize a restored widget back into the dock.
    @MainActor
    func minimizeWidget(widgetId: String) {
        guard restoredWidgetIds.contains(widgetId) else { return }
        toggleMinimize(widgetId: widgetId)
    }

    /// Close a widget from the sidebar, deactivating it (no longer shown in UI).
    @MainActor
    func closeWidget(widgetId: String) {
        minimizeWidget(widgetId: widgetId)
    }

    /// Remove a widget from the sidebar display (tvOS: dismisses without persisting minimize state).
    @MainActor
    func dismissFromSidebar(widgetId: String) {
        widgets.removeAll { $0.id == widgetId }
    }

    /// Toggle dock visibility.
    @MainActor
    func toggleDock() {
        isDockVisible.toggle()
    }

    /// Hide the dock.
    @MainActor
    func hideDock() {
        isDockVisible = false
    }
}
