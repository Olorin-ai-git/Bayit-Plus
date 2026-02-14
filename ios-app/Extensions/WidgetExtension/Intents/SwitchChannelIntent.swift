import AppIntents
import BayitWidgetShared

/// Errors that can occur during widget intent execution.
enum IntentError: Error, CustomLocalizedStringResourceConvertible {
    case notAuthenticated
    case unauthorized

    var localizedStringResource: LocalizedStringResource {
        switch self {
        case .notAuthenticated:
            return "Please sign in to Bayit+ to use this feature"
        case .unauthorized:
            return "You don't have permission to access this content"
        }
    }
}

/// Switch to a different channel from the widget.
/// Opens the app and navigates to the specified channel.
struct SwitchChannelIntent: AppIntent {
    static let title: LocalizedStringResource = "Switch Channel"
    static let description = IntentDescription("Switch to a channel on Bayit+")
    static let openAppWhenRun = true

    @Parameter(title: "Channel ID")
    var channelID: String

    @Parameter(title: "Channel Name")
    var channelName: String

    static var parameterSummary: some ParameterSummary {
        Summary("Switch to \(\.$channelName)")
    }

    @MainActor
    func perform() async throws -> some IntentResult {
        guard SharedKeychainHelper().readAuthToken() != nil else {
            throw IntentError.notAuthenticated
        }

        let intent = SharedPendingIntent(
            action: PendingIntentActions.switchChannel,
            contentID: channelID,
            contentType: .liveTV
        )
        await WidgetDataStore.shared.writePendingIntent(intent)
        return .result()
    }
}
