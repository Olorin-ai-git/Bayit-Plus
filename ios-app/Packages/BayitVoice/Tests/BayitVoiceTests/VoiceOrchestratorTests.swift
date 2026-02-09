#if os(iOS)
import XCTest
@testable import BayitVoice
import BayitCore

@MainActor
final class VoiceOrchestratorTests: XCTestCase {

    private var orchestrator: VoiceOrchestrator!
    private var mockSpeechService: MockSpeechRecognitionService!
    private var mockTTSService: MockTTSService!
    private var mockWebSocketClient: MockVoiceWebSocketClient!
    private var mockVoiceRepository: MockVoiceRepository!

    override func setUp() async throws {
        try await super.setUp()
        mockSpeechService = MockSpeechRecognitionService()
        mockTTSService = MockTTSService()
        mockWebSocketClient = MockVoiceWebSocketClient()
        mockVoiceRepository = MockVoiceRepository()

        orchestrator = VoiceOrchestrator(
            speechService: mockSpeechService,
            ttsService: mockTTSService,
            webSocketClient: mockWebSocketClient,
            voiceRepository: mockVoiceRepository
        )
    }

    override func tearDown() async throws {
        orchestrator = nil
        mockSpeechService = nil
        mockTTSService = nil
        mockWebSocketClient = nil
        mockVoiceRepository = nil
        try await super.tearDown()
    }

    // MARK: - Initialization Tests

    func testOrchestratorInitialization() {
        XCTAssertEqual(orchestrator.state, .idle)
        XCTAssertEqual(orchestrator.currentTranscript, "")
        XCTAssertEqual(orchestrator.responseText, "")
        XCTAssertNil(orchestrator.lastIntent)
        XCTAssertNil(orchestrator.lastAction)
        XCTAssertNil(orchestrator.lastGesture)
        XCTAssertNil(orchestrator.conversationId)
        XCTAssertNil(orchestrator.error)
        XCTAssertEqual(orchestrator.language, "en")
    }

    // MARK: - State Machine Tests

    func testInitialStateIsIdle() {
        XCTAssertEqual(orchestrator.state, .idle)
    }

    func testLanguageCanBeSet() {
        orchestrator.language = "he"
        XCTAssertEqual(orchestrator.language, "he")
    }

    // MARK: - Interrupt Tests

    func testInterruptTransitionsToIdle() {
        orchestrator.interrupt()
        XCTAssertEqual(orchestrator.state, .idle)
    }

    // MARK: - End Session Tests

    func testEndSessionClearsConversationId() {
        orchestrator.endSession()
        XCTAssertNil(orchestrator.conversationId)
        XCTAssertEqual(orchestrator.state, .idle)
    }

    // MARK: - Observable Tests

    func testOrchestratorIsObservable() {
        // VoiceOrchestrator should be @Observable
        XCTAssertNotNil(orchestrator)
    }

    // MARK: - MainActor Tests

    func testOrchestratorIsMainActor() async {
        // VoiceOrchestrator should be @MainActor
        await MainActor.run {
            XCTAssertEqual(orchestrator.state, .idle)
        }
    }

    // MARK: - Intent Action Callback Tests

    func testOnIntentActionCallbackCanBeSet() {
        var callbackInvoked = false
        orchestrator.onIntentAction = { intent, action in
            callbackInvoked = true
        }

        XCTAssertNotNil(orchestrator.onIntentAction)
    }
}

// MARK: - Mock Services

private final class MockSpeechRecognitionService: SpeechRecognitionService, Sendable {
    // Mock implementation - returns denied permissions
    override func checkPermissions() -> VoicePermissions {
        return VoicePermissions(microphone: false, speechRecognition: false)
    }

    override func requestPermissions() async -> VoicePermissions {
        return VoicePermissions(microphone: false, speechRecognition: false)
    }
}

private final class MockTTSService: TTSService, @unchecked Sendable {
    var speakCalled = false
    var stopCalled = false

    override func speak(_ text: String, language: String) {
        speakCalled = true
    }

    override func stop() {
        stopCalled = true
    }
}

private final class MockVoiceWebSocketClient: VoiceWebSocketClient, Sendable {
    // Mock implementation
}

private final class MockVoiceRepository: VoiceRepository, Sendable {
    func processVoice(request: VoiceRequest) async throws -> VoiceResponse {
        return VoiceResponse(
            intent: .chat,
            spokenResponse: "Mock response",
            action: nil,
            conversationId: "mock-conv-id",
            confidence: 0.9,
            gesture: nil
        )
    }
}
#endif
