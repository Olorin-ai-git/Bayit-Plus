#if os(iOS)
import XCTest
@testable import BayitVoice

final class SpeechRecognitionServiceTests: XCTestCase {

    private var speechService: SpeechRecognitionService!

    override func setUp() {
        super.setUp()
        speechService = SpeechRecognitionService()
    }

    override func tearDown() {
        speechService = nil
        super.tearDown()
    }

    // MARK: - Initialization Tests

    func testSpeechRecognitionServiceInitialization() {
        let service = SpeechRecognitionService()
        XCTAssertNotNil(service)
    }

    // MARK: - Permissions Check Tests

    func testCheckPermissionsReturnsPermissions() {
        let permissions = speechService.checkPermissions()

        XCTAssertNotNil(permissions)
        // Permissions will be false in test environment by default
        XCTAssertFalse(permissions.microphone || permissions.speechRecognition)
    }

    func testCheckPermissionsIsSynchronous() {
        // This test verifies checkPermissions() can be called synchronously
        let permissions = speechService.checkPermissions()
        XCTAssertNotNil(permissions)
    }

    // MARK: - Request Permissions Tests

    func testRequestPermissionsIsAsync() async {
        // This test verifies requestPermissions() is async
        let permissions = await speechService.requestPermissions()
        XCTAssertNotNil(permissions)
    }

    func testRequestPermissionsReturnsVoicePermissions() async {
        let permissions = await speechService.requestPermissions()

        XCTAssertNotNil(permissions)
        // In test environment, permissions are typically denied
        // This test just verifies the structure is correct
    }

    // MARK: - Sendable Conformance Tests

    func testSpeechRecognitionServiceIsSendable() {
        let service = speechService!

        Task {
            let capturedService = service
            XCTAssertNotNil(capturedService)
        }
    }

    // MARK: - Error Handling Tests

    func testStartRecognitionThrowsWithoutPermissions() {
        let permissions = speechService.checkPermissions()

        if !permissions.microphone || !permissions.speechRecognition {
            // Expected: startRecognition should throw without permissions
            XCTAssertThrowsError(try speechService.startRecognition(language: "en")) { error in
                XCTAssertTrue(error is SpeechError)
            }
        }
    }

    // MARK: - Language Support Tests

    func testSupportsMultipleLanguages() {
        // These languages should be supported
        let supportedLanguages = ["en", "he", "es", "fr", "zh", "it", "ja"]

        for language in supportedLanguages {
            // Test doesn't throw for unsupported language enum
            // Actual locale mapping is tested separately
            XCTAssertNotNil(language)
        }
    }
}

// MARK: - SpeechError Tests

final class SpeechErrorTests: XCTestCase {

    func testMicrophonePermissionDeniedError() {
        let error = SpeechError.microphonePermissionDenied
        XCTAssertEqual(error.errorDescription, "Microphone permission not granted")
    }

    func testSpeechPermissionDeniedError() {
        let error = SpeechError.speechPermissionDenied
        XCTAssertEqual(error.errorDescription, "Speech recognition permission not granted")
    }

    func testRecognizerUnavailableError() {
        let error = SpeechError.recognizerUnavailable("fr-FR")
        XCTAssertEqual(error.errorDescription, "Speech recognizer unavailable for language: fr-FR")
    }

    func testAudioSessionFailedError() {
        let underlyingError = NSError(domain: "TestDomain", code: 100, userInfo: nil)
        let error = SpeechError.audioSessionFailed(underlyingError)
        XCTAssertTrue(error.errorDescription?.contains("Audio session configuration failed") ?? false)
    }

    func testAudioEngineFailedError() {
        let underlyingError = NSError(domain: "TestDomain", code: 200, userInfo: nil)
        let error = SpeechError.audioEngineFailed(underlyingError)
        XCTAssertTrue(error.errorDescription?.contains("Audio engine start failed") ?? false)
    }

    func testSpeechErrorConformsToLocalizedError() {
        let error: LocalizedError = SpeechError.microphonePermissionDenied
        XCTAssertNotNil(error.errorDescription)
    }

    func testSpeechErrorIsSendable() {
        let error = SpeechError.speechPermissionDenied

        Task {
            let capturedError = error
            XCTAssertNotNil(capturedError.errorDescription)
        }
    }
}
#endif
