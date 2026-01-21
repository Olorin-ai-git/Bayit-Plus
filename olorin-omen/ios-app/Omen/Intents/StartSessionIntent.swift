import AppIntents
import Foundation

/// App Intent for starting Omen session via Action Button
struct StartSessionIntent: AppIntent {
    static var title: LocalizedStringResource = "Start Omen Session"

    static var description = IntentDescription(
        "Starts a new Omen transcription and translation session.",
        categoryName: "Transcription"
    )

    static var openAppWhenRun: Bool = true

    @MainActor
    func perform() async throws -> some IntentResult {
        // Post notification to start session
        // The app will handle this notification in OmenApp
        NotificationCenter.default.post(
            name: NSNotification.Name("StartOmenSession"),
            object: nil
        )

        return .result()
    }
}

// MARK: - App Shortcuts Provider

struct OmenShortcuts: AppShortcutsProvider {
    static var appShortcuts: [AppShortcut] {
        AppShortcut(
            intent: StartSessionIntent(),
            phrases: [
                "Start \(.applicationName)",
                "Begin \(.applicationName) session",
                "Start transcription"
            ],
            shortTitle: "Start Session",
            systemImageName: "waveform"
        )
    }
}
