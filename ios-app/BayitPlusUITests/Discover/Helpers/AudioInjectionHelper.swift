import XCTest

@MainActor
enum AudioInjectionHelper {
    enum AudioSample: String {
        case hebrewHello = "hebrew-hello"
        case hebrewPhrase = "hebrew-phrase"
        case hebrewSentence = "hebrew-sentence"
    }

    // MARK: - Boundary Tests (No Mic)

    static func verifyMicPermissionPrompt(
        _ app: XCUIApplication,
        timeout: TimeInterval = 5
    ) -> Bool {
        let micPrompt = app.alerts.firstMatch
        let hasMicPrompt = micPrompt.waitForExistence(timeout: timeout)

        if hasMicPrompt {
            let micText = app.alerts.staticTexts.matching(
                NSPredicate(format: "label CONTAINS[c] 'microphone' OR label CONTAINS[c] 'מיקרופון'")
            ).firstMatch
            return micText.exists
        }

        let micUnavailable = app.staticTexts.matching(
            NSPredicate(format: "label CONTAINS[c] 'microphone' OR label CONTAINS[c] 'unavailable' OR label CONTAINS[c] 'מיקרופון'")
        ).firstMatch
        return micUnavailable.waitForExistence(timeout: 3)
    }

    static func dismissMicPermissionPrompt(_ app: XCUIApplication) {
        let alert = app.alerts.firstMatch
        if alert.waitForExistence(timeout: 3) {
            let dontAllow = alert.buttons.matching(
                NSPredicate(format: "label CONTAINS[c] 'Don' OR label CONTAINS[c] 'Allow'")
            ).firstMatch
            if dontAllow.exists {
                dontAllow.tap()
            }
        }
    }

    // MARK: - Synthetic Audio Injection

    static func injectAudio(
        _ app: XCUIApplication,
        sample: AudioSample
    ) {
        app.launchEnvironment["E2E_AUDIO_INPUT"] = sample.rawValue
    }

    static func verifyRecordingUIAppears(
        _ app: XCUIApplication,
        timeout: TimeInterval = 5
    ) -> Bool {
        let recordButton = app.buttons.matching(
            NSPredicate(format: "label CONTAINS[c] 'record' OR label CONTAINS[c] 'speak' OR label CONTAINS[c] 'listen' OR label CONTAINS[c] 'הקלט'")
        ).firstMatch

        return recordButton.waitForExistence(timeout: timeout)
    }

    static func verifyPronunciationScore(
        _ app: XCUIApplication,
        timeout: TimeInterval = 10
    ) -> Bool {
        let score = app.staticTexts.matching(
            NSPredicate(format: "label MATCHES '.*[0-9]+%.*' OR label CONTAINS[c] 'score' OR label CONTAINS[c] 'ציון'")
        ).firstMatch

        return score.waitForExistence(timeout: timeout)
    }

    static func verifyAIResponse(
        _ app: XCUIApplication,
        timeout: TimeInterval = 10
    ) -> Bool {
        let response = app.staticTexts.matching(
            NSPredicate(format: "label.length > 20")
        ).firstMatch

        return response.waitForExistence(timeout: timeout)
    }
}
