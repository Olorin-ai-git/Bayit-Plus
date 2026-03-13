import XCTest

@MainActor
enum ContentSourceHelper {
    enum ContentSource: String {
        case plex
        case youtube
    }

    // MARK: - VOD Content Navigation

    static func navigateToVODContent(
        _ app: XCUIApplication,
        source: ContentSource,
        timeout: TimeInterval = 8
    ) {
        NavigationHelper.switchToTab(app, tab: "VOD")

        switch source {
        case .plex:
            let byocSection = app.staticTexts.matching(
                NSPredicate(format: "label CONTAINS[c] 'BYOC' OR label CONTAINS[c] 'My Content' OR label CONTAINS[c] 'Plex'")
            ).firstMatch
            XCTAssertTrue(byocSection.waitForExistence(timeout: timeout), "BYOC/Plex section not found")
            byocSection.tap()

            let plexItem = app.buttons.matching(
                NSPredicate(format: "label CONTAINS[c] 'plex'")
            ).firstMatch
            if plexItem.waitForExistence(timeout: 5) {
                plexItem.tap()
            }

        case .youtube:
            NavigationHelper.switchToTab(app, tab: "Home")

            let scrollView = app.scrollViews.firstMatch
            let youtubeHeader = app.staticTexts.matching(
                NSPredicate(format: "label CONTAINS[c] 'From YouTube' OR label CONTAINS[c] 'YouTube'")
            ).firstMatch

            if !youtubeHeader.waitForExistence(timeout: 3), scrollView.exists {
                for _ in 0 ..< 4 {
                    scrollView.swipeUp()
                    if youtubeHeader.waitForExistence(timeout: 1) { break }
                }
            }
            XCTAssertTrue(
                youtubeHeader.waitForExistence(timeout: timeout),
                "BYOC/YouTube section not found"
            )

            let youtubeCard = app.buttons.matching(
                NSPredicate(format: "accessibilityHint CONTAINS[c] 'Tap to open'")
            ).firstMatch
            XCTAssertTrue(
                youtubeCard.waitForExistence(timeout: 5),
                "No YouTube content card found"
            )
            youtubeCard.tap()
        }
    }

    static func playFirstVODItem(
        _ app: XCUIApplication,
        timeout: TimeInterval = 8
    ) {
        let firstItem = app.buttons.matching(
            NSPredicate(format: "label CONTAINS[c] 'play' OR label CONTAINS[c] 'watch'")
        ).firstMatch

        if !firstItem.waitForExistence(timeout: timeout) {
            let collectionItem = app.collectionViews.cells.firstMatch
            XCTAssertTrue(collectionItem.waitForExistence(timeout: timeout), "No VOD content found")
            collectionItem.tap()
        } else {
            firstItem.tap()
        }
    }

    // MARK: - Live TV Navigation

    static func tuneToChannel13(
        _ app: XCUIApplication,
        timeout: TimeInterval = 8
    ) {
        NavigationHelper.switchToTab(app, tab: "Live TV")

        let channel = app.buttons.matching(
            NSPredicate(format: "label CONTAINS[c] 'Channel 13' OR label CONTAINS[c] 'Reshet 13' OR label CONTAINS[c] '13'")
        ).firstMatch

        XCTAssertTrue(channel.waitForExistence(timeout: timeout), "Channel 13 not found")
        channel.tap()
    }

    // MARK: - Player Verification

    static func waitForPlayerReady(
        _ app: XCUIApplication,
        timeout: TimeInterval = 15
    ) -> Bool {
        let player = app.otherElements.matching(
            NSPredicate(format: "label CONTAINS[c] 'player' OR label CONTAINS[c] 'video'")
        ).firstMatch

        return player.waitForExistence(timeout: timeout)
    }

    // MARK: - Performance Measurement

    static func measureResponseTime(
        action: () -> Void,
        waitForElement: XCUIElement,
        timeout: TimeInterval = 10
    ) -> TimeInterval {
        let start = CFAbsoluteTimeGetCurrent()
        action()
        _ = waitForElement.waitForExistence(timeout: timeout)
        let end = CFAbsoluteTimeGetCurrent()
        return end - start
    }
}
