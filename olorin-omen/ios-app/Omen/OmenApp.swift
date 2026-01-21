import SwiftUI

@main
struct OmenApp: App {
    init() {
        // Setup notification observer for Action Button intent
        NotificationCenter.default.addObserver(
            forName: NSNotification.Name("StartOmenSession"),
            object: nil,
            queue: .main
        ) { _ in
            // Action Button pressed - navigate to session
            NotificationCenter.default.post(
                name: NSNotification.Name("ActionButtonPressed"),
                object: nil
            )
        }
    }

    var body: some Scene {
        WindowGroup {
            AppRootView()
        }
    }
}
