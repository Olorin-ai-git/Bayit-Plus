/**
 * SiriModule - Siri Shortcuts Integration
 *
 * Enables Siri voice commands through user activity donation:
 * - Users can add shortcuts via "Add to Siri" button
 * - Siri learns from user actions and suggests shortcuts
 * - App handles voice-triggered user activities
 *
 * Supported Commands:
 * - "Play [content] on Bayit Plus"
 * - "Resume watching on Bayit Plus"
 * - "Search for [query] on Bayit Plus"
 * - "Open [channel] widget on Bayit Plus"
 */

import Foundation
import Intents
import React

@objc(SiriModule)
class SiriModule: NSObject {

  // MARK: - Intent Donation

  @objc func donatePlayIntent(_ contentId: String,
                               contentTitle: String,
                               contentType: String,
                               resolve: @escaping RCTPromiseResolveBlock,
                               reject: @escaping RCTPromiseRejectBlock) {
    // Create user activity for "Play content"
    let activity = NSUserActivity(activityType: "tv.bayit.plus.playContent")
    activity.title = "Play \(contentTitle)"
    activity.isEligibleForSearch = true
    activity.isEligibleForPrediction = true

    // Add metadata
    activity.userInfo = [
      "contentId": contentId,
      "contentTitle": contentTitle,
      "contentType": contentType
    ]

    // Create suggested invocation phrase for Siri
    let attributes = CSSearchableItemAttributeSet(contentType: .content)
    attributes.contentDescription = "Play \(contentTitle) on Bayit Plus"
    attributes.relatedUniqueIdentifier = contentId

    activity.contentAttributeSet = attributes
    activity.persistentIdentifier = "playContent-\(contentId)"

    // Donate to Siri
    activity.becomeCurrent()

    // Create Siri shortcut suggestion
    if #available(iOS 12.0, *) {
      let intent = createPlayMediaIntent(contentId: contentId,
                                         contentTitle: contentTitle,
                                         contentType: contentType)

      let interaction = INInteraction(intent: intent, response: nil)
      interaction.donate { error in
        if let error = error {
          reject("SIRI_ERROR", "Failed to donate intent: \(error.localizedDescription)", error)
        } else {
          resolve(["success": true, "activityType": activity.activityType])
        }
      }
    } else {
      resolve(["success": true, "activityType": activity.activityType])
    }
  }

  @objc func donateSearchIntent(_ query: String,
                                 resolve: @escaping RCTPromiseResolveBlock,
                                 reject: @escaping RCTPromiseRejectBlock) {
    // Create user activity for "Search"
    let activity = NSUserActivity(activityType: "tv.bayit.plus.searchContent")
    activity.title = "Search for \(query)"
    activity.isEligibleForSearch = true
    activity.isEligibleForPrediction = true

    activity.userInfo = ["query": query]

    let attributes = CSSearchableItemAttributeSet(contentType: .content)
    attributes.contentDescription = "Search for \(query) on Bayit Plus"

    activity.contentAttributeSet = attributes
    activity.persistentIdentifier = "searchContent-\(query)"

    activity.becomeCurrent()

    resolve(["success": true, "activityType": activity.activityType])
  }

  @objc func donateResumeIntent(_ resolve: @escaping RCTPromiseResolveBlock,
                                 reject: @escaping RCTPromiseRejectBlock) {
    // Create user activity for "Resume watching"
    let activity = NSUserActivity(activityType: "tv.bayit.plus.resumeWatching")
    activity.title = "Resume Watching"
    activity.isEligibleForSearch = true
    activity.isEligibleForPrediction = true

    let attributes = CSSearchableItemAttributeSet(contentType: .content)
    attributes.contentDescription = "Resume watching on Bayit Plus"

    activity.contentAttributeSet = attributes
    activity.persistentIdentifier = "resumeWatching"

    activity.becomeCurrent()

    resolve(["success": true, "activityType": activity.activityType])
  }

  @objc func donateWidgetIntent(_ widgetType: String,
                                 channelId: String,
                                 channelName: String,
                                 resolve: @escaping RCTPromiseResolveBlock,
                                 reject: @escaping RCTPromiseRejectBlock) {
    // Create user activity for "Open widget"
    let activity = NSUserActivity(activityType: "tv.bayit.plus.openWidget")
    activity.title = "Open \(channelName) widget"
    activity.isEligibleForSearch = true
    activity.isEligibleForPrediction = true

    activity.userInfo = [
      "widgetType": widgetType,
      "channelId": channelId,
      "channelName": channelName
    ]

    let attributes = CSSearchableItemAttributeSet(contentType: .content)
    attributes.contentDescription = "Open \(channelName) widget on Bayit Plus"

    activity.contentAttributeSet = attributes
    activity.persistentIdentifier = "openWidget-\(channelId)"

    activity.becomeCurrent()

    resolve(["success": true, "activityType": activity.activityType])
  }

  // MARK: - Siri Suggestions

  @objc func getSuggestedShortcuts(_ resolve: @escaping RCTPromiseResolveBlock,
                                    reject: @escaping RCTPromiseRejectBlock) {
    if #available(iOS 12.0, *) {
      INVoiceShortcutCenter.shared.getAllVoiceShortcuts { shortcuts, error in
        if let error = error {
          reject("SIRI_ERROR", "Failed to get shortcuts: \(error.localizedDescription)", error)
          return
        }

        let shortcutData = shortcuts?.map { shortcut in
          return [
            "identifier": shortcut.identifier.uuidString,
            "phrase": shortcut.invocationPhrase
          ]
        } ?? []

        resolve(["shortcuts": shortcutData])
      }
    } else {
      resolve(["shortcuts": []])
    }
  }

  @objc func deleteAllShortcuts(_ resolve: @escaping RCTPromiseResolveBlock,
                                 reject: @escaping RCTPromiseRejectBlock) {
    if #available(iOS 12.0, *) {
      INVoiceShortcutCenter.shared.getAllVoiceShortcuts { shortcuts, error in
        if let error = error {
          reject("SIRI_ERROR", "Failed to get shortcuts: \(error.localizedDescription)", error)
          return
        }

        guard let shortcuts = shortcuts else {
          resolve(["deleted": 0])
          return
        }

        for shortcut in shortcuts {
          INVoiceShortcutCenter.shared.setShortcutSuggestions([])
        }

        resolve(["deleted": shortcuts.count])
      }
    } else {
      resolve(["deleted": 0])
    }
  }

  // MARK: - Helper Methods

  @available(iOS 12.0, *)
  private func createPlayMediaIntent(contentId: String, contentTitle: String, contentType: String) -> INIntent {
    // Use INPlayMediaIntent for media playback
    let intent = INPlayMediaIntent()

    // Create media item
    let mediaItem = INMediaItem(
      identifier: contentId,
      title: contentTitle,
      type: contentType == "live" ? .tvShow : .video,
      artwork: nil
    )

    intent.mediaItems = [mediaItem]
    intent.playbackRepeatMode = .none
    intent.playbackSpeed = 1.0
    intent.resumePlayback = false

    // Set suggested phrase
    intent.suggestedInvocationPhrase = "Play \(contentTitle)"

    return intent
  }

  // MARK: - React Native Bridge

  @objc static func requiresMainQueueSetup() -> Bool {
    return true
  }
}
