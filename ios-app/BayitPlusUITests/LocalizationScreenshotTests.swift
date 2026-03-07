import XCTest

@MainActor
final class LocalizationScreenshotTests: XCTestCase {
    private let languages = ["en", "he", "es", "fr", "zh", "it", "hi", "ta", "bn", "ja"]

    // MARK: - Home Screenshots

    func testHomeScreenshots() {
        for language in languages {
            let app = AppLaunchHelper.launchApp(language: language)
            XCTAssertTrue(NavigationHelper.waitForTabBar(app))
            ScreenshotHelper.captureScreen(app, screen: "home", language: language)
            app.terminate()
        }
    }

    // MARK: - Live TV Screenshots

    func testLiveTVScreenshots() {
        for language in languages {
            let app = AppLaunchHelper.launchApp(language: language)
            XCTAssertTrue(NavigationHelper.waitForTabBar(app))
            NavigationHelper.switchToTab(app, tab: "Live TV")
            ScreenshotHelper.captureScreen(app, screen: "livetv", language: language)
            app.terminate()
        }
    }

    // MARK: - VOD Screenshots

    func testVODScreenshots() {
        for language in languages {
            let app = AppLaunchHelper.launchApp(language: language)
            XCTAssertTrue(NavigationHelper.waitForTabBar(app))
            NavigationHelper.switchToTab(app, tab: "VOD")
            ScreenshotHelper.captureScreen(app, screen: "vod", language: language)
            app.terminate()
        }
    }

    // MARK: - Listen Screenshots

    func testListenScreenshots() {
        for language in languages {
            let app = AppLaunchHelper.launchApp(language: language)
            XCTAssertTrue(NavigationHelper.waitForTabBar(app))
            NavigationHelper.switchToTab(app, tab: "Listen")
            ScreenshotHelper.captureScreen(app, screen: "listen", language: language)
            app.terminate()
        }
    }

    // MARK: - Podcasts Screenshots

    func testPodcastsScreenshots() {
        for language in languages {
            let app = AppLaunchHelper.launchApp(language: language)
            XCTAssertTrue(NavigationHelper.waitForTabBar(app))
            NavigationHelper.switchToTab(app, tab: "Podcasts")
            ScreenshotHelper.captureScreen(app, screen: "podcasts", language: language)
            app.terminate()
        }
    }

    // MARK: - Settings Screenshots

    func testSettingsScreenshots() {
        for language in languages {
            let app = AppLaunchHelper.launchApp(language: language, navigateTo: "settings")
            _ = app.otherElements.firstMatch.waitForExistence(timeout: 8)
            ScreenshotHelper.captureScreen(app, screen: "settings", language: language)
            app.terminate()
        }
    }

    // MARK: - Language Settings Screenshots

    func testLanguageSettingsScreenshots() {
        for language in languages {
            let app = AppLaunchHelper.launchApp(language: language, navigateTo: "languageSettings")
            _ = app.otherElements.firstMatch.waitForExistence(timeout: 8)
            ScreenshotHelper.captureScreen(app, screen: "languageSettings", language: language)
            app.terminate()
        }
    }
}
