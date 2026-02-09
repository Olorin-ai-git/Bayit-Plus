import XCTest
@testable import BayitVoice

final class VoiceModelsTests: XCTestCase {

    // MARK: - VoiceState Tests

    func testVoiceStateRawValues() {
        XCTAssertEqual(VoiceState.idle.rawValue, "idle")
        XCTAssertEqual(VoiceState.listening.rawValue, "listening")
        XCTAssertEqual(VoiceState.processing.rawValue, "processing")
        XCTAssertEqual(VoiceState.speaking.rawValue, "speaking")
        XCTAssertEqual(VoiceState.error.rawValue, "error")
    }

    func testVoiceStateEquality() {
        XCTAssertEqual(VoiceState.idle, VoiceState.idle)
        XCTAssertEqual(VoiceState.listening, VoiceState.listening)
        XCTAssertNotEqual(VoiceState.idle, VoiceState.listening)
    }

    func testVoiceStateIsSendable() {
        let state = VoiceState.listening
        Task {
            let capturedState = state
            XCTAssertEqual(capturedState, .listening)
        }
    }

    // MARK: - VoiceTrigger Tests

    func testVoiceTriggerRawValues() {
        XCTAssertEqual(VoiceTrigger.manual.rawValue, "manual")
        XCTAssertEqual(VoiceTrigger.wakeWord.rawValue, "wake-word")
    }

    func testVoiceTriggerCodable() throws {
        let trigger = VoiceTrigger.manual

        let encoder = JSONEncoder()
        let data = try encoder.encode(trigger)

        let decoder = JSONDecoder()
        let decoded = try decoder.decode(VoiceTrigger.self, from: data)

        XCTAssertEqual(decoded, trigger)
    }

    // MARK: - VoiceIntentType Tests

    func testVoiceIntentTypeRawValues() {
        XCTAssertEqual(VoiceIntentType.chat.rawValue, "CHAT")
        XCTAssertEqual(VoiceIntentType.search.rawValue, "SEARCH")
        XCTAssertEqual(VoiceIntentType.navigation.rawValue, "NAVIGATION")
        XCTAssertEqual(VoiceIntentType.playlist.rawValue, "PLAYLIST")
        XCTAssertEqual(VoiceIntentType.channel.rawValue, "CHANNEL")
        XCTAssertEqual(VoiceIntentType.playback.rawValue, "PLAYBACK")
        XCTAssertEqual(VoiceIntentType.dubbing.rawValue, "DUBBING")
        XCTAssertEqual(VoiceIntentType.subtitle.rawValue, "SUBTITLE")
        XCTAssertEqual(VoiceIntentType.settings.rawValue, "SETTINGS")
        XCTAssertEqual(VoiceIntentType.widget.rawValue, "WIDGET")
        XCTAssertEqual(VoiceIntentType.unknown.rawValue, "UNKNOWN")
    }

    func testVoiceIntentTypeCodable() throws {
        let intent = VoiceIntentType.search

        let encoder = JSONEncoder()
        let data = try encoder.encode(intent)

        let decoder = JSONDecoder()
        let decoded = try decoder.decode(VoiceIntentType.self, from: data)

        XCTAssertEqual(decoded, intent)
    }

    func testVoiceIntentTypeDecodesUnknownToUnknown() throws {
        let json = "\"INVALID_INTENT\"".data(using: .utf8)!

        let decoder = JSONDecoder()
        let decoded = try decoder.decode(VoiceIntentType.self, from: json)

        XCTAssertEqual(decoded, .unknown)
    }

    // MARK: - VoiceAction Tests

    func testVoiceActionInitialization() {
        let action = VoiceAction(type: "navigate", payload: ["screen": AnyCodable("home")])

        XCTAssertEqual(action.type, "navigate")
        XCTAssertNotNil(action.payload)
    }

    func testVoiceActionWithoutPayload() {
        let action = VoiceAction(type: "pause", payload: nil)

        XCTAssertEqual(action.type, "pause")
        XCTAssertNil(action.payload)
    }

    func testVoiceActionCodable() throws {
        let action = VoiceAction(type: "play", payload: ["contentId": AnyCodable("12345")])

        let encoder = JSONEncoder()
        let data = try encoder.encode(action)

        let decoder = JSONDecoder()
        let decoded = try decoder.decode(VoiceAction.self, from: data)

        XCTAssertEqual(decoded.type, action.type)
    }

    func testVoiceActionEquality() {
        let action1 = VoiceAction(type: "play", payload: nil)
        let action2 = VoiceAction(type: "play", payload: nil)
        let action3 = VoiceAction(type: "pause", payload: nil)

        XCTAssertEqual(action1, action2)
        XCTAssertNotEqual(action1, action3)
    }

    // MARK: - GestureState Tests

    func testGestureStateInitialization() {
        let gesture = GestureState(gesture: "wave", duration: 2000)

        XCTAssertEqual(gesture.gesture, "wave")
        XCTAssertEqual(gesture.duration, 2000)
    }

    func testGestureStateCodable() throws {
        let gesture = GestureState(gesture: "nod", duration: 1500)

        let encoder = JSONEncoder()
        let data = try encoder.encode(gesture)

        let decoder = JSONDecoder()
        let decoded = try decoder.decode(GestureState.self, from: data)

        XCTAssertEqual(decoded.gesture, gesture.gesture)
        XCTAssertEqual(decoded.duration, gesture.duration)
    }

    // MARK: - VoiceRequest Tests

    func testVoiceRequestInitialization() {
        let request = VoiceRequest(
            transcript: "Play music",
            language: "en",
            conversationId: "conv-123",
            trigger: .manual
        )

        XCTAssertEqual(request.transcript, "Play music")
        XCTAssertEqual(request.language, "en")
        XCTAssertEqual(request.conversationId, "conv-123")
        XCTAssertEqual(request.platform, "ios")
        XCTAssertEqual(request.triggerType, "manual")
    }

    func testVoiceRequestDefaultTrigger() {
        let request = VoiceRequest(
            transcript: "Search movies",
            language: "he"
        )

        XCTAssertEqual(request.triggerType, "manual")
        XCTAssertNil(request.conversationId)
    }

    func testVoiceRequestEncodable() throws {
        let request = VoiceRequest(
            transcript: "What's the weather?",
            language: "en",
            conversationId: "conv-456",
            trigger: .wakeWord
        )

        let encoder = JSONEncoder()
        let data = try encoder.encode(request)
        let json = try JSONSerialization.jsonObject(with: data) as? [String: Any]

        XCTAssertNotNil(json)
        XCTAssertEqual(json?["transcript"] as? String, "What's the weather?")
        XCTAssertEqual(json?["language"] as? String, "en")
        XCTAssertEqual(json?["platform"] as? String, "ios")
        XCTAssertEqual(json?["triggerType"] as? String, "wake-word")
    }

    // MARK: - VoiceResponse Tests

    func testVoiceResponseDecoding() throws {
        let jsonString = """
        {
            "intent": "SEARCH",
            "spokenResponse": "Here are the results",
            "action": {
                "type": "search",
                "payload": {"query": "movies"}
            },
            "conversationId": "conv-789",
            "confidence": 0.95,
            "gesture": {
                "gesture": "point",
                "duration": 1000
            }
        }
        """

        let data = jsonString.data(using: .utf8)!
        let decoder = JSONDecoder()
        let response = try decoder.decode(VoiceResponse.self, from: data)

        XCTAssertEqual(response.intent, .search)
        XCTAssertEqual(response.spokenResponse, "Here are the results")
        XCTAssertNotNil(response.action)
        XCTAssertEqual(response.conversationId, "conv-789")
        XCTAssertEqual(response.confidence, 0.95)
        XCTAssertNotNil(response.gesture)
    }

    // MARK: - SpeechResult Tests

    func testSpeechResultInitialization() {
        let result = SpeechResult(
            transcription: "Hello world",
            isFinal: true,
            confidence: 0.92
        )

        XCTAssertEqual(result.transcription, "Hello world")
        XCTAssertTrue(result.isFinal)
        XCTAssertEqual(result.confidence, 0.92)
    }

    func testSpeechResultEquality() {
        let result1 = SpeechResult(transcription: "Test", isFinal: true, confidence: 0.9)
        let result2 = SpeechResult(transcription: "Test", isFinal: true, confidence: 0.9)
        let result3 = SpeechResult(transcription: "Test", isFinal: false, confidence: 0.9)

        XCTAssertEqual(result1, result2)
        XCTAssertNotEqual(result1, result3)
    }

    // MARK: - VoicePermissions Tests

    func testVoicePermissionsInitialization() {
        let permissions = VoicePermissions(microphone: true, speechRecognition: true)

        XCTAssertTrue(permissions.microphone)
        XCTAssertTrue(permissions.speechRecognition)
        XCTAssertTrue(permissions.allGranted)
    }

    func testVoicePermissionsNotAllGranted() {
        let permissions1 = VoicePermissions(microphone: false, speechRecognition: true)
        XCTAssertFalse(permissions1.allGranted)

        let permissions2 = VoicePermissions(microphone: true, speechRecognition: false)
        XCTAssertFalse(permissions2.allGranted)

        let permissions3 = VoicePermissions(microphone: false, speechRecognition: false)
        XCTAssertFalse(permissions3.allGranted)
    }

    func testVoicePermissionsEquality() {
        let perm1 = VoicePermissions(microphone: true, speechRecognition: true)
        let perm2 = VoicePermissions(microphone: true, speechRecognition: true)
        let perm3 = VoicePermissions(microphone: false, speechRecognition: true)

        XCTAssertEqual(perm1, perm2)
        XCTAssertNotEqual(perm1, perm3)
    }

    // MARK: - TTSVoiceInfo Tests

    func testTTSVoiceInfoInitialization() {
        let voiceInfo = TTSVoiceInfo(
            id: "voice-1",
            name: "Daniel",
            language: "en-US",
            quality: .premium
        )

        XCTAssertEqual(voiceInfo.id, "voice-1")
        XCTAssertEqual(voiceInfo.name, "Daniel")
        XCTAssertEqual(voiceInfo.language, "en-US")
        XCTAssertEqual(voiceInfo.quality, .premium)
    }

    func testTTSVoiceInfoEquality() {
        let voice1 = TTSVoiceInfo(id: "v1", name: "Voice1", language: "en", quality: .standard)
        let voice2 = TTSVoiceInfo(id: "v1", name: "Voice1", language: "en", quality: .standard)
        let voice3 = TTSVoiceInfo(id: "v2", name: "Voice2", language: "en", quality: .standard)

        XCTAssertEqual(voice1, voice2)
        XCTAssertNotEqual(voice1, voice3)
    }

    // MARK: - TTSVoiceQuality Tests

    func testTTSVoiceQualityRawValues() {
        XCTAssertEqual(TTSVoiceQuality.standard.rawValue, "default")
        XCTAssertEqual(TTSVoiceQuality.enhanced.rawValue, "enhanced")
        XCTAssertEqual(TTSVoiceQuality.premium.rawValue, "premium")
    }

    // MARK: - AnyCodable Tests

    func testAnyCodableWithString() {
        let value = AnyCodable("test string")
        XCTAssertEqual(value.value as? String, "test string")
    }

    func testAnyCodableWithInt() {
        let value = AnyCodable(42)
        XCTAssertEqual(value.value as? Int, 42)
    }

    func testAnyCodableWithDouble() {
        let value = AnyCodable(3.14)
        XCTAssertEqual(value.value as? Double, 3.14)
    }

    func testAnyCodableWithBool() {
        let value = AnyCodable(true)
        XCTAssertEqual(value.value as? Bool, true)
    }

    func testAnyCodableCodableString() throws {
        let value = AnyCodable("hello")
        let encoder = JSONEncoder()
        let data = try encoder.encode(value)

        let decoder = JSONDecoder()
        let decoded = try decoder.decode(AnyCodable.self, from: data)

        XCTAssertEqual(decoded.value as? String, "hello")
    }

    func testAnyCodableEquality() {
        let value1 = AnyCodable("test")
        let value2 = AnyCodable("test")
        let value3 = AnyCodable("different")

        XCTAssertEqual(value1, value2)
        XCTAssertNotEqual(value1, value3)
    }
}
