import CoreSpotlight
import Foundation
import Intents
import UniformTypeIdentifiers

/// Donates NSUserActivity instances to Siri so it can learn user patterns
/// and suggest Bayit+ shortcuts at appropriate times.
/// Ported from React Native SiriModule.swift, converted to async/await.
@MainActor
final class ActivityDonationService {

    // MARK: - Activity Types

    private enum ActivityType {
        static let playContent = "tv.bayit.plus.playContent"
        static let searchContent = "tv.bayit.plus.searchContent"
        static let resumeWatching = "tv.bayit.plus.resumeWatching"
    }

    // MARK: - Donate Play

    /// Donate a "play content" activity so Siri learns the user watches
    /// specific content and can suggest it proactively.
    func donatePlay(
        contentId: String,
        contentTitle: String,
        contentType: String
    ) {
        let activity = NSUserActivity(activityType: ActivityType.playContent)
        activity.title = "Play \(contentTitle)"
        activity.isEligibleForSearch = true
        activity.isEligibleForPrediction = true

        activity.userInfo = [
            "contentId": contentId,
            "contentTitle": contentTitle,
            "contentType": contentType,
        ]

        let attributes = CSSearchableItemAttributeSet(
            contentType: UTType.audiovisualContent
        )
        attributes.contentDescription = "Play \(contentTitle) on Bayit Plus"
        attributes.relatedUniqueIdentifier = contentId

        activity.contentAttributeSet = attributes
        activity.persistentIdentifier = "playContent-\(contentId)"

        activity.becomeCurrent()

        // Also donate an INInteraction for richer Siri integration
        donateMediaInteraction(
            contentId: contentId,
            contentTitle: contentTitle,
            contentType: contentType
        )

        // Record for resume functionality
        let type = ContentType(rawValue: contentType) ?? .movie
        PendingIntentManager.shared.recordPlayback(
            contentId: contentId,
            contentType: type
        )
    }

    // MARK: - Donate Search

    /// Donate a search activity so Siri learns the user's search patterns.
    func donateSearch(query: String) {
        let activity = NSUserActivity(activityType: ActivityType.searchContent)
        activity.title = "Search for \(query)"
        activity.isEligibleForSearch = true
        activity.isEligibleForPrediction = true

        activity.userInfo = ["query": query]

        let attributes = CSSearchableItemAttributeSet(
            contentType: UTType.audiovisualContent
        )
        attributes.contentDescription = "Search for \(query) on Bayit Plus"

        activity.contentAttributeSet = attributes
        activity.persistentIdentifier = "searchContent-\(query)"

        activity.becomeCurrent()
    }

    // MARK: - Donate Resume

    /// Donate a "resume watching" activity when the user pauses content.
    func donateResume() {
        let activity = NSUserActivity(
            activityType: ActivityType.resumeWatching
        )
        activity.title = "Resume Watching"
        activity.isEligibleForSearch = true
        activity.isEligibleForPrediction = true

        let attributes = CSSearchableItemAttributeSet(
            contentType: UTType.audiovisualContent
        )
        attributes.contentDescription = "Resume watching on Bayit Plus"

        activity.contentAttributeSet = attributes
        activity.persistentIdentifier = "resumeWatching"

        activity.becomeCurrent()
    }

    // MARK: - Private

    private func donateMediaInteraction(
        contentId: String,
        contentTitle: String,
        contentType: String
    ) {
        let mediaItem = INMediaItem(
            identifier: contentId,
            title: contentTitle,
            type: contentType == "live" ? .tvShow : .movie,
            artwork: nil
        )

        let intent = INPlayMediaIntent(
            mediaItems: [mediaItem],
            mediaContainer: nil,
            playShuffled: nil,
            playbackRepeatMode: .none,
            resumePlayback: false,
            playbackQueueLocation: .now,
            playbackSpeed: nil,
            mediaSearch: nil
        )
        intent.suggestedInvocationPhrase = "Play \(contentTitle)"

        let interaction = INInteraction(intent: intent, response: nil)
        interaction.donate()
    }
}
