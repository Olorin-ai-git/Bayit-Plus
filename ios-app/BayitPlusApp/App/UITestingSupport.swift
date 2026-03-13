import Foundation

enum UITestingSupport {
    static var isUITesting: Bool {
        ProcessInfo.processInfo.arguments.contains("--ui-testing")
    }

    static var isSkipAuth: Bool {
        ProcessInfo.processInfo.arguments.contains("--skip-auth")
    }

    static var seedBYOCYouTube: Bool {
        ProcessInfo.processInfo.arguments.contains("--seed-youtube")
    }

    static var navigateToRoute: String? {
        ProcessInfo.processInfo.environment["UI_TEST_NAVIGATE_TO"]
    }

    static var testLanguage: String? {
        ProcessInfo.processInfo.environment["UI_TEST_LANGUAGE"]
    }

    static var shouldReduceAnimations: Bool {
        isUITesting
    }
}
