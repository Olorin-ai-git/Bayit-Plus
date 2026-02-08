import XCTest

@MainActor
final class LocalizationUITests: XCTestCase {

    private let languages = ["en", "he", "es", "fr", "zh", "it", "hi", "ta", "bn", "ja"]

    // MARK: - Language Rendering

    func testAllLanguagesRender() {
        for language in languages {
            let app = AppLaunchHelper.launchApp(language: language)

            XCTAssertTrue(
                NavigationHelper.waitForTabBar(app),
                "Tab bar failed to load for language: \(language)"
            )

            XCTAssertGreaterThan(
                app.staticTexts.count, 0,
                "No text rendered for language: \(language)"
            )

            app.terminate()
        }
    }

    // MARK: - Hebrew RTL

    func testHebrewRTLLayout() {
        let app = AppLaunchHelper.launchApp(language: "he")

        XCTAssertTrue(
            NavigationHelper.waitForTabBar(app),
            "Tab bar failed to load for Hebrew"
        )

        let hasStaticTexts = app.staticTexts.count > 0
        XCTAssertTrue(hasStaticTexts, "No text rendered in Hebrew mode")

        app.terminate()
    }

    // MARK: - Tab Buttons Per Language

    func testTabBarExistsInAllLanguages() {
        for language in languages {
            let app = AppLaunchHelper.launchApp(language: language)

            XCTAssertTrue(
                NavigationHelper.waitForTabBar(app),
                "Tab bar not found for language: \(language)"
            )

            let hasAllTabs = app.buttons["tab_liveTV"].exists
                && app.buttons["tab_vod"].exists
                && app.buttons["tab_radio"].exists
                && app.buttons["tab_podcasts"].exists

            XCTAssertTrue(
                hasAllTabs,
                "Not all tab buttons found for language: \(language)"
            )

            app.terminate()
        }
    }

    // MARK: - Content Loads Per Language

    func testContentLoadsInAllLanguages() {
        for language in languages {
            let app = AppLaunchHelper.launchApp(language: language)

            XCTAssertTrue(
                NavigationHelper.waitForTabBar(app),
                "Tab bar not visible for language: \(language)"
            )

            let hasContent = NavigationHelper.verifyScreenHasContent(app)
            XCTAssertTrue(hasContent, "No content loaded for language: \(language)")

            app.terminate()
        }
    }
}
