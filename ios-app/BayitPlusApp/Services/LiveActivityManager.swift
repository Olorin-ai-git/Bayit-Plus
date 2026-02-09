import ActivityKit
import BayitCore
import BayitWidgetShared
import Foundation

/// Manages Live Activities for now-playing media on the Lock Screen
/// and Dynamic Island.
@MainActor
final class LiveActivityManager {

    // MARK: - Properties

    private var currentActivity: Activity<NowPlayingAttributes>?
    private let logger = BayitLogger(category: "LiveActivity")

    // MARK: - Start

    func startActivity(
        channelName: String,
        channelLogoURL: URL?,
        showTitle: String,
        isPlaying: Bool,
        progress: Double
    ) {
        guard ActivityAuthorizationInfo().areActivitiesEnabled else {
            logger.warning("Live Activities are not enabled on this device")
            return
        }

        let attributes = NowPlayingAttributes(
            channelName: channelName,
            channelLogoURL: channelLogoURL
        )
        let initialState = NowPlayingAttributes.ContentState(
            showTitle: showTitle,
            isPlaying: isPlaying,
            progress: progress
        )
        let content = ActivityContent(state: initialState, staleDate: nil)

        do {
            currentActivity = try Activity.request(
                attributes: attributes,
                content: content
            )
            logger.info("Started live activity", context: [
                "channel": channelName,
                "show": showTitle
            ])
        } catch {
            logger.error(
                "Failed to start live activity",
                error: error,
                context: ["channel": channelName]
            )
        }
    }

    // MARK: - Update

    func updateActivity(
        showTitle: String,
        isPlaying: Bool,
        progress: Double
    ) async {
        guard let activity = currentActivity else {
            logger.debug("No active live activity to update")
            return
        }

        let updatedState = NowPlayingAttributes.ContentState(
            showTitle: showTitle,
            isPlaying: isPlaying,
            progress: progress
        )
        let content = ActivityContent(state: updatedState, staleDate: nil)

        await activity.update(content)
        logger.debug("Updated live activity", context: [
            "show": showTitle,
            "playing": String(isPlaying)
        ])
    }

    // MARK: - End

    func endActivity() async {
        guard let activity = currentActivity else {
            logger.debug("No active live activity to end")
            return
        }

        await activity.end(nil, dismissalPolicy: .default)
        currentActivity = nil
        logger.info("Ended live activity")
    }
}
