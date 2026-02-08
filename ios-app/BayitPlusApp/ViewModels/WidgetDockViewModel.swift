import BayitCore
import Foundation
import Observation

/// Lightweight view model for the global floating widget dock.
/// Loads the user's active widgets and manages dock visibility state.
/// Used by MainTabView to render PiPWidgetManagerView across all tabs.
@Observable
final class WidgetDockViewModel {
    private(set) var widgets: [WidgetItem] = []
    private(set) var isLoading = false
    var isDockVisible = true

    private let repository: any WidgetRepository
    private let logger = BayitLogger(category: "WidgetDock")

    init(repository: any WidgetRepository) {
        self.repository = repository
    }

    /// Load the user's active widgets for the dock.
    @MainActor
    func loadWidgets() async {
        guard !isLoading else { return }
        isLoading = true

        do {
            let response = try await repository.fetchMyWidgets()
            widgets = response.items.filter { $0.isVisible != false }
            logger.info("Loaded \(widgets.count) dock widgets")
        } catch {
            logger.error("Failed to load dock widgets: \(error.localizedDescription)")
        }

        isLoading = false
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
