import XCTest

@MainActor
enum ScreenshotHelper {

    static func capture(
        _ app: XCUIApplication,
        name: String,
        activity: XCTActivity? = nil
    ) {
        let screenshot = app.screenshot()
        let attachment = XCTAttachment(screenshot: screenshot)
        attachment.name = name
        attachment.lifetime = .keepAlways

        if let activity {
            activity.add(attachment)
        } else {
            XCTContext.runActivity(named: "Screenshot: \(name)") { activity in
                activity.add(attachment)
            }
        }
    }

    static func captureScreen(
        _ app: XCUIApplication,
        screen: String,
        language: String = "en",
        device: String = "default"
    ) {
        let name = "\(screen)_\(language)_\(device)"
        capture(app, name: name)
    }
}
