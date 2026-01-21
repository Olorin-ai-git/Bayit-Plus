/**
 * IntentHandler - SiriKit Intent Handler
 *
 * Handles Siri voice commands for Bayit+ app:
 * - Play content (live channels, VOD, radio, podcasts)
 * - Resume watching
 * - Search for content
 * - Add to watchlist
 * - Open widgets
 */

import Intents

class IntentHandler: INExtension {

  override func handler(for intent: INIntent) -> Any {
    // Route intents to appropriate handlers
    if intent is PlayContentIntent {
      return PlayContentIntentHandler()
    } else if intent is ResumeWatchingIntent {
      return ResumeWatchingIntentHandler()
    } else if intent is SearchContentIntent {
      return SearchContentIntentHandler()
    } else if intent is AddToWatchlistIntent {
      return AddToWatchlistIntentHandler()
    } else if intent is OpenWidgetIntent {
      return OpenWidgetIntentHandler()
    }

    fatalError("Unhandled intent: \(intent)")
  }
}

// MARK: - Play Content Intent Handler

class PlayContentIntentHandler: NSObject, PlayContentIntentHandling {

  func handle(intent: PlayContentIntent, completion: @escaping (PlayContentIntentResponse) -> Void) {
    guard let contentTitle = intent.contentTitle,
          let contentType = intent.contentType else {
      completion(PlayContentIntentResponse(code: .failure, userActivity: nil))
      return
    }

    // Create deep link URL
    let deepLink: String
    switch contentType {
    case "live":
      deepLink = "bayitplus://live/\(intent.contentId ?? "")"
    case "vod":
      deepLink = "bayitplus://vod/\(intent.contentId ?? "")"
    case "radio":
      deepLink = "bayitplus://radio/\(intent.contentId ?? "")"
    case "podcast":
      deepLink = "bayitplus://podcast/\(intent.contentId ?? "")"
    default:
      deepLink = "bayitplus://player/\(intent.contentId ?? "")"
    }

    // Create user activity for app continuation
    let userActivity = NSUserActivity(activityType: "tv.bayit.plus.playContent")
    userActivity.title = "Play \(contentTitle)"
    userActivity.userInfo = [
      "contentId": intent.contentId ?? "",
      "contentTitle": contentTitle,
      "contentType": contentType,
      "deepLink": deepLink
    ]
    userActivity.isEligibleForPrediction = true
    userActivity.persistentIdentifier = "playContent-\(intent.contentId ?? "")"

    // Return success response
    let response = PlayContentIntentResponse(code: .success, userActivity: userActivity)
    response.contentTitle = contentTitle
    completion(response)
  }

  func resolveContentTitle(for intent: PlayContentIntent, with completion: @escaping (INStringResolutionResult) -> Void) {
    if let contentTitle = intent.contentTitle {
      completion(INStringResolutionResult.success(with: contentTitle))
    } else {
      completion(INStringResolutionResult.needsValue())
    }
  }

  func resolveContentType(for intent: PlayContentIntent, with completion: @escaping (INStringResolutionResult) -> Void) {
    if let contentType = intent.contentType {
      completion(INStringResolutionResult.success(with: contentType))
    } else {
      completion(INStringResolutionResult.needsValue())
    }
  }
}

// MARK: - Resume Watching Intent Handler

class ResumeWatchingIntentHandler: NSObject, ResumeWatchingIntentHandling {

  func handle(intent: ResumeWatchingIntent, completion: @escaping (ResumeWatchingIntentResponse) -> Void) {
    // Create user activity for app continuation
    let userActivity = NSUserActivity(activityType: "tv.bayit.plus.resumeWatching")
    userActivity.title = "Resume Watching"
    userActivity.userInfo = ["action": "resumeWatching"]
    userActivity.isEligibleForPrediction = true
    userActivity.persistentIdentifier = "resumeWatching"

    let response = ResumeWatchingIntentResponse(code: .success, userActivity: userActivity)
    completion(response)
  }
}

// MARK: - Search Content Intent Handler

class SearchContentIntentHandler: NSObject, SearchContentIntentHandling {

  func handle(intent: SearchContentIntent, completion: @escaping (SearchContentIntentResponse) -> Void) {
    guard let query = intent.query else {
      completion(SearchContentIntentResponse(code: .failure, userActivity: nil))
      return
    }

    // Create user activity for app continuation
    let userActivity = NSUserActivity(activityType: "tv.bayit.plus.searchContent")
    userActivity.title = "Search for \(query)"
    userActivity.userInfo = [
      "query": query,
      "deepLink": "bayitplus://search?q=\(query)"
    ]
    userActivity.isEligibleForPrediction = true
    userActivity.persistentIdentifier = "searchContent-\(query)"

    let response = SearchContentIntentResponse(code: .success, userActivity: userActivity)
    response.query = query
    completion(response)
  }

  func resolveQuery(for intent: SearchContentIntent, with completion: @escaping (INStringResolutionResult) -> Void) {
    if let query = intent.query {
      completion(INStringResolutionResult.success(with: query))
    } else {
      completion(INStringResolutionResult.needsValue())
    }
  }
}

// MARK: - Add to Watchlist Intent Handler

class AddToWatchlistIntentHandler: NSObject, AddToWatchlistIntentHandling {

  func handle(intent: AddToWatchlistIntent, completion: @escaping (AddToWatchlistIntentResponse) -> Void) {
    guard let contentId = intent.contentId,
          let contentTitle = intent.contentTitle else {
      completion(AddToWatchlistIntentResponse(code: .failure, userActivity: nil))
      return
    }

    // Create user activity for app continuation
    let userActivity = NSUserActivity(activityType: "tv.bayit.plus.addToWatchlist")
    userActivity.title = "Add \(contentTitle) to Watchlist"
    userActivity.userInfo = [
      "contentId": contentId,
      "contentTitle": contentTitle,
      "action": "addToWatchlist"
    ]

    let response = AddToWatchlistIntentResponse(code: .success, userActivity: userActivity)
    response.contentTitle = contentTitle
    completion(response)
  }
}

// MARK: - Open Widget Intent Handler

class OpenWidgetIntentHandler: NSObject, OpenWidgetIntentHandling {

  func handle(intent: OpenWidgetIntent, completion: @escaping (OpenWidgetIntentResponse) -> Void) {
    guard let widgetType = intent.widgetType else {
      completion(OpenWidgetIntentResponse(code: .failure, userActivity: nil))
      return
    }

    // Create user activity for app continuation
    let userActivity = NSUserActivity(activityType: "tv.bayit.plus.openWidget")
    userActivity.title = "Open \(widgetType) widget"
    userActivity.userInfo = [
      "widgetType": widgetType,
      "channelId": intent.channelId ?? "",
      "action": "openWidget"
    ]

    let response = OpenWidgetIntentResponse(code: .success, userActivity: userActivity)
    response.widgetType = widgetType
    completion(response)
  }

  func resolveWidgetType(for intent: OpenWidgetIntent, with completion: @escaping (INStringResolutionResult) -> Void) {
    if let widgetType = intent.widgetType {
      completion(INStringResolutionResult.success(with: widgetType))
    } else {
      completion(INStringResolutionResult.needsValue())
    }
  }
}
