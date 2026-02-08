import XCTest

final class AuthFlowUITests: XCTestCase {

    private var app: XCUIApplication!

    override func setUpWithError() throws {
        continueAfterFailure = false
        app = XCUIApplication()
        app.launchArguments = ["--ui-testing"]
        app.launch()
    }

    // MARK: - Login Screen Elements

    func testLoginScreenDisplaysLogo() {
        let logo = app.staticTexts["Bayit+"]
        XCTAssertTrue(logo.waitForExistence(timeout: 5))
    }

    func testLoginScreenDisplaysSubtitle() {
        let subtitle = app.staticTexts["Premium Jewish Streaming"]
        XCTAssertTrue(subtitle.waitForExistence(timeout: 5))
    }

    func testLoginScreenDisplaysSocialButtons() {
        XCTAssertTrue(
            app.buttons["Continue with Google"].waitForExistence(timeout: 5)
        )
        XCTAssertTrue(app.buttons["Continue with Apple"].exists)
    }

    func testLoginScreenDisplaysEmailFields() {
        let emailField = app.textFields["Email"]
        XCTAssertTrue(emailField.waitForExistence(timeout: 5))
        XCTAssertTrue(app.secureTextFields["Password"].exists)
    }

    func testLoginScreenDisplaysSignInButton() {
        let signIn = app.buttons["Sign In"]
        XCTAssertTrue(signIn.waitForExistence(timeout: 5))
    }

    func testLoginScreenDisplaysRegisterLink() {
        let register = app.buttons.matching(
            NSPredicate(format: "label CONTAINS 'Sign up'")
        )
        XCTAssertGreaterThan(register.count, 0)
    }

    // MARK: - Email Input

    func testEmailFieldAcceptsInput() {
        let emailField = app.textFields["Email"]
        XCTAssertTrue(emailField.waitForExistence(timeout: 5))
        emailField.tap()
        emailField.typeText("test@example.com")
        XCTAssertEqual(emailField.value as? String, "test@example.com")
    }

    func testPasswordFieldAcceptsInput() {
        let passwordField = app.secureTextFields["Password"]
        XCTAssertTrue(passwordField.waitForExistence(timeout: 5))
        passwordField.tap()
        passwordField.typeText("password123")
    }

    // MARK: - Navigation to Register

    func testTapSignUpNavigatesToRegister() {
        let signUp = app.buttons.matching(
            NSPredicate(format: "label CONTAINS 'Sign up'")
        ).firstMatch
        XCTAssertTrue(signUp.waitForExistence(timeout: 5))
        signUp.tap()

        let createAccount = app.staticTexts["Create Account"]
        XCTAssertTrue(createAccount.waitForExistence(timeout: 3))
    }
}
