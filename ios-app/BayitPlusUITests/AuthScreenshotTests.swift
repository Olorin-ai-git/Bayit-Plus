import XCTest

@MainActor
final class AuthScreenshotTests: XCTestCase {

    private var app: XCUIApplication!

    override func setUpWithError() throws {
        continueAfterFailure = false
        app = AppLaunchHelper.launchForAuth()
    }

    // MARK: - Login Screenshot

    func testLoginScreenScreenshot() {
        let logo = app.staticTexts["Bayit+"]
        XCTAssertTrue(logo.waitForExistence(timeout: 5), "Bayit+ logo not found")

        ScreenshotHelper.captureScreen(app, screen: "login")
    }

    // MARK: - Register Screenshot

    func testRegisterScreenScreenshot() {
        let signUp = app.buttons.matching(
            NSPredicate(format: "label CONTAINS 'Sign up'")
        ).firstMatch
        XCTAssertTrue(signUp.waitForExistence(timeout: 5), "Sign up button not found")
        signUp.tap()

        let createAccount = app.staticTexts["Create Account"]
        XCTAssertTrue(createAccount.waitForExistence(timeout: 5), "Register screen not loaded")

        ScreenshotHelper.captureScreen(app, screen: "register")
    }
}
