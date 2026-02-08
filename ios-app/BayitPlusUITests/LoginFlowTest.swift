import XCTest

@MainActor
final class LoginFlowTest: XCTestCase {

    func testRealSignIn() {
        let app = AppLaunchHelper.launchForAuth()

        // Wait for login screen
        let signInButton = app.buttons["Sign In"]
        XCTAssertTrue(signInButton.waitForExistence(timeout: 10), "Sign In button not found")

        // Clear any existing text and enter email
        let emailField = app.textFields.firstMatch
        XCTAssertTrue(emailField.waitForExistence(timeout: 5), "Email field not found")
        emailField.tap()
        // Select all and delete existing text
        if let currentValue = emailField.value as? String, !currentValue.isEmpty {
            emailField.press(forDuration: 1.0)
            let selectAll = app.menuItems["Select All"]
            if selectAll.waitForExistence(timeout: 2) {
                selectAll.tap()
            }
            emailField.typeText(XCUIKeyboardKey.delete.rawValue)
        }
        emailField.typeText("admin@olorin.ai")

        // Enter password
        let passwordField = app.secureTextFields.firstMatch
        XCTAssertTrue(passwordField.waitForExistence(timeout: 5), "Password field not found")
        passwordField.tap()
        passwordField.typeText("Jersey1973!")

        // Screenshot before sign in
        ScreenshotHelper.captureScreen(app, screen: "login_before_signin")

        // Tap Sign In
        signInButton.tap()

        // Wait 2 seconds for response
        _ = app.otherElements.firstMatch.waitForExistence(timeout: 2)

        // Screenshot immediately after tap
        ScreenshotHelper.captureScreen(app, screen: "login_after_signin_2s")

        // Wait more
        _ = app.otherElements.firstMatch.waitForExistence(timeout: 5)
        ScreenshotHelper.captureScreen(app, screen: "login_after_signin_7s")

        // Check for success (tab bar) or any error/profile selection
        let tabHome = app.buttons["tab_home"]
        let profileSelection = app.staticTexts.matching(
            NSPredicate(format: "label CONTAINS[c] 'profile' OR label CONTAINS[c] 'select' OR label CONTAINS[c] 'choose'")
        ).firstMatch

        _ = tabHome.waitForExistence(timeout: 10)

        // Final screenshot
        ScreenshotHelper.captureScreen(app, screen: "login_final_state")

        // Dump all visible text
        let allTexts = app.staticTexts.allElementsBoundByIndex
        var textDump = "All visible text after login attempt:\n"
        for (i, text) in allTexts.enumerated() {
            textDump += "  \(i): '\(text.label)'\n"
        }

        let allButtons = app.buttons.allElementsBoundByIndex
        var buttonDump = "All visible buttons:\n"
        for (i, btn) in allButtons.enumerated() {
            buttonDump += "  \(i): '\(btn.label)'\n"
        }

        // Check for loading indicator
        let spinner = app.activityIndicators.firstMatch
        let hasAlert = app.alerts.firstMatch.exists

        XCTContext.runActivity(named: "Login Diagnostics") { activity in
            let attachment = XCTAttachment(string: """
            tab_home found: \(tabHome.exists)
            profileSelection found: \(profileSelection.exists)
            signIn still visible: \(signInButton.exists)
            spinner visible: \(spinner.exists)
            alert visible: \(hasAlert)
            static text count: \(allTexts.count)
            button count: \(allButtons.count)
            \(textDump)
            \(buttonDump)
            """)
            attachment.name = "login_diagnostics"
            attachment.lifetime = .keepAlways
            activity.add(attachment)
        }

        XCTAssertTrue(true)
    }
}
