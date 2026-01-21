/**
 * BayitPlusIntents - Custom Siri Intent Definitions
 *
 * Defines custom intents for Bayit+ voice commands:
 * - PlayContentIntent: "Play Channel 13 on Bayit Plus"
 * - ResumeWatchingIntent: "Resume my show on Bayit Plus"
 * - SearchContentIntent: "Search for comedy on Bayit Plus"
 * - AddToWatchlistIntent: "Add this to my watchlist"
 * - OpenWidgetIntent: "Open live news widget"
 */

import Intents

// MARK: - Play Content Intent

public protocol PlayContentIntentHandling: NSObjectProtocol {
  func handle(intent: PlayContentIntent, completion: @escaping (PlayContentIntentResponse) -> Void)
  @objc optional func resolveContentTitle(for intent: PlayContentIntent, with completion: @escaping (INStringResolutionResult) -> Void)
  @objc optional func resolveContentType(for intent: PlayContentIntent, with completion: @escaping (INStringResolutionResult) -> Void)
}

@available(iOS 12.0, *)
public class PlayContentIntent: INIntent {
  @NSManaged public var contentId: String?
  @NSManaged public var contentTitle: String?
  @NSManaged public var contentType: String? // "live", "vod", "radio", "podcast"
}

@available(iOS 12.0, *)
public class PlayContentIntentResponse: INIntentResponse {
  public enum Code: Int {
    case unspecified = 0
    case ready
    case success
    case failure
    case failureRequiringAppLaunch
  }

  @NSManaged public var code: Code
  @NSManaged public var contentTitle: String?

  public convenience init(code: Code, userActivity: NSUserActivity?) {
    self.init()
    self.code = code
    self.userActivity = userActivity
  }
}

// MARK: - Resume Watching Intent

public protocol ResumeWatchingIntentHandling: NSObjectProtocol {
  func handle(intent: ResumeWatchingIntent, completion: @escaping (ResumeWatchingIntentResponse) -> Void)
}

@available(iOS 12.0, *)
public class ResumeWatchingIntent: INIntent {
  // No parameters needed - just resumes last watched content
}

@available(iOS 12.0, *)
public class ResumeWatchingIntentResponse: INIntentResponse {
  public enum Code: Int {
    case unspecified = 0
    case ready
    case success
    case failure
    case failureRequiringAppLaunch
  }

  @NSManaged public var code: Code

  public convenience init(code: Code, userActivity: NSUserActivity?) {
    self.init()
    self.code = code
    self.userActivity = userActivity
  }
}

// MARK: - Search Content Intent

public protocol SearchContentIntentHandling: NSObjectProtocol {
  func handle(intent: SearchContentIntent, completion: @escaping (SearchContentIntentResponse) -> Void)
  @objc optional func resolveQuery(for intent: SearchContentIntent, with completion: @escaping (INStringResolutionResult) -> Void)
}

@available(iOS 12.0, *)
public class SearchContentIntent: INIntent {
  @NSManaged public var query: String?
}

@available(iOS 12.0, *)
public class SearchContentIntentResponse: INIntentResponse {
  public enum Code: Int {
    case unspecified = 0
    case ready
    case success
    case failure
    case failureRequiringAppLaunch
  }

  @NSManaged public var code: Code
  @NSManaged public var query: String?

  public convenience init(code: Code, userActivity: NSUserActivity?) {
    self.init()
    self.code = code
    self.userActivity = userActivity
  }
}

// MARK: - Add to Watchlist Intent

public protocol AddToWatchlistIntentHandling: NSObjectProtocol {
  func handle(intent: AddToWatchlistIntent, completion: @escaping (AddToWatchlistIntentResponse) -> Void)
}

@available(iOS 12.0, *)
public class AddToWatchlistIntent: INIntent {
  @NSManaged public var contentId: String?
  @NSManaged public var contentTitle: String?
}

@available(iOS 12.0, *)
public class AddToWatchlistIntentResponse: INIntentResponse {
  public enum Code: Int {
    case unspecified = 0
    case ready
    case success
    case failure
    case failureRequiringAppLaunch
  }

  @NSManaged public var code: Code
  @NSManaged public var contentTitle: String?

  public convenience init(code: Code, userActivity: NSUserActivity?) {
    self.init()
    self.code = code
    self.userActivity = userActivity
  }
}

// MARK: - Open Widget Intent

public protocol OpenWidgetIntentHandling: NSObjectProtocol {
  func handle(intent: OpenWidgetIntent, completion: @escaping (OpenWidgetIntentResponse) -> Void)
  @objc optional func resolveWidgetType(for intent: OpenWidgetIntent, with completion: @escaping (INStringResolutionResult) -> Void)
}

@available(iOS 12.0, *)
public class OpenWidgetIntent: INIntent {
  @NSManaged public var widgetType: String? // "live", "podcast", "radio"
  @NSManaged public var channelId: String?
}

@available(iOS 12.0, *)
public class OpenWidgetIntentResponse: INIntentResponse {
  public enum Code: Int {
    case unspecified = 0
    case ready
    case success
    case failure
    case failureRequiringAppLaunch
  }

  @NSManaged public var code: Code
  @NSManaged public var widgetType: String?

  public convenience init(code: Code, userActivity: NSUserActivity?) {
    self.init()
    self.code = code
    self.userActivity = userActivity
  }
}
