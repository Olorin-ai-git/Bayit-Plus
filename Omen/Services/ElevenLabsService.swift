import Foundation
import AVFoundation
import Combine

/// ElevenLabs Text-to-Speech service using model v3
class ElevenLabsService: NSObject, ObservableObject {
    // MARK: - Published Properties

    /// Whether TTS is currently speaking
    @Published private(set) var isSpeaking = false

    /// Current voice being used
    @Published var currentVoice: TranslationSettings.TTSVoice = .rachel

    /// Whether TTS is enabled
    @Published var isEnabled = false

    /// Error message
    @Published private(set) var errorMessage: String?

    // MARK: - Private Properties

    private let apiKey: String
    private var audioPlayer: AVAudioPlayer?
    private let session: URLSession
    private var currentTask: URLSessionDataTask?
    private let debouncer = Debouncer(delay: 0.5)

    // MARK: - Constants

    private let baseURL = "https://api.elevenlabs.io/v1/text-to-speech"
    private let modelID = "eleven_turbo_v2_5"

    // MARK: - Initialization

    init(apiKey: String) {
        self.apiKey = apiKey

        let configuration = URLSessionConfiguration.default
        configuration.timeoutIntervalForRequest = 30
        self.session = URLSession(configuration: configuration)

        super.init()
    }

    // MARK: - Public Methods

    /// Synthesize and speak text
    func synthesizeAndSpeak(_ text: String) {
        guard isEnabled, !text.isEmpty else { return }

        // Debounce to avoid overwhelming the API
        debouncer.debounce { [weak self] in
            Task {
                await self?.performSynthesis(text)
            }
        }
    }

    /// Stop current speech
    func stop() {
        currentTask?.cancel()
        audioPlayer?.stop()
        debouncer.cancel()

        Task { @MainActor in
            isSpeaking = false
        }
    }

    // MARK: - Private Methods

    /// Perform TTS synthesis
    private func performSynthesis(_ text: String) async {
        do {
            let audioData = try await synthesize(text: text, voiceID: currentVoice.voiceID)
            await playAudio(data: audioData)
        } catch {
            await MainActor.run {
                errorMessage = error.localizedDescription
            }
        }
    }

    /// Synthesize text to speech
    private func synthesize(text: String, voiceID: String) async throws -> Data {
        let urlString = "\(baseURL)/\(voiceID)/stream"
        guard let url = URL(string: urlString) else {
            throw ElevenLabsError.invalidURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue(apiKey, forHTTPHeaderField: "xi-api-key")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let requestBody: [String: Any] = [
            "text": text,
            "model_id": modelID,
            "voice_settings": [
                "stability": 0.5,
                "similarity_boost": 0.75,
                "style": 0.0,
                "use_speaker_boost": true
            ]
        ]

        request.httpBody = try JSONSerialization.data(withJSONObject: requestBody)

        await MainActor.run {
            isSpeaking = true
        }

        let (data, response) = try await session.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw ElevenLabsError.invalidResponse
        }

        switch httpResponse.statusCode {
        case 200:
            return data
        case 401:
            throw ElevenLabsError.unauthorized
        case 429:
            throw ElevenLabsError.rateLimited
        case 400...499:
            throw ElevenLabsError.clientError(httpResponse.statusCode)
        case 500...599:
            throw ElevenLabsError.serverError(httpResponse.statusCode)
        default:
            throw ElevenLabsError.unknownError(httpResponse.statusCode)
        }
    }

    /// Play synthesized audio
    private func playAudio(data: Data) async {
        do {
            // Configure audio session for playback
            let audioSession = AVAudioSession.sharedInstance()
            try audioSession.setCategory(
                .playAndRecord,
                mode: .default,
                options: [.defaultToSpeaker, .allowBluetooth, .allowBluetoothA2DP]
            )
            try audioSession.setActive(true)

            // Create audio player
            let player = try AVAudioPlayer(data: data)
            player.delegate = self
            self.audioPlayer = player

            // Play audio
            player.play()

            await MainActor.run {
                isSpeaking = true
                errorMessage = nil
            }
        } catch {
            await MainActor.run {
                isSpeaking = false
                errorMessage = "Playback error: \(error.localizedDescription)"
            }
        }
    }
}

// MARK: - AVAudioPlayerDelegate

extension ElevenLabsService: AVAudioPlayerDelegate {
    func audioPlayerDidFinishPlaying(_ player: AVAudioPlayer, successfully flag: Bool) {
        Task { @MainActor in
            isSpeaking = false
        }
    }

    func audioPlayerDecodeErrorDidOccur(_ player: AVAudioPlayer, error: Error?) {
        Task { @MainActor in
            isSpeaking = false
            if let error = error {
                errorMessage = "Decode error: \(error.localizedDescription)"
            }
        }
    }
}

// MARK: - Errors

enum ElevenLabsError: LocalizedError {
    case invalidURL
    case invalidResponse
    case unauthorized
    case rateLimited
    case clientError(Int)
    case serverError(Int)
    case unknownError(Int)
    case apiKeyMissing

    var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "Invalid ElevenLabs URL"
        case .invalidResponse:
            return "Invalid response from server"
        case .unauthorized:
            return "Invalid API key"
        case .rateLimited:
            return "Rate limit exceeded - please wait"
        case .clientError(let code):
            return "Client error: \(code)"
        case .serverError(let code):
            return "Server error: \(code)"
        case .unknownError(let code):
            return "Unknown error: \(code)"
        case .apiKeyMissing:
            return "ElevenLabs API key not configured"
        }
    }
}
