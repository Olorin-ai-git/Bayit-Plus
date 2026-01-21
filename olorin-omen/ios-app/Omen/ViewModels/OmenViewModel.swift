import Foundation
import Combine
import SwiftUI

/// Main ViewModel coordinating all services and app state
@MainActor
class OmenViewModel: ObservableObject {
    // MARK: - Published Properties

    /// Whether a session is currently active
    @Published private(set) var isSessionActive = false

    /// User translation settings
    @Published var settings: TranslationSettings {
        didSet {
            settings.save()
            if isSessionActive {
                updateServices()
            }
        }
    }

    // MARK: - Services

    let audioEngine: AudioEngine
    let openAIService: OpenAIService
    let elevenLabsService: ElevenLabsService
    let bluetoothManager: BluetoothManager

    // MARK: - Private Properties

    private var cancellables = Set<AnyCancellable>()

    // MARK: - Initialization

    init() {
        // Load API keys from configuration
        guard let openAIKey = Bundle.main.openAIAPIKey else {
            fatalError("OpenAI API key not configured. Please add OPENAI_API_KEY to Config.xcconfig")
        }

        guard let elevenLabsKey = Bundle.main.elevenLabsAPIKey else {
            fatalError("ElevenLabs API key not configured. Please add ELEVENLABS_API_KEY to Config.xcconfig")
        }

        // Initialize services
        self.audioEngine = AudioEngine()
        self.openAIService = OpenAIService(apiKey: openAIKey)
        self.elevenLabsService = ElevenLabsService(apiKey: elevenLabsKey)
        self.bluetoothManager = BluetoothManager()

        // Load settings
        self.settings = TranslationSettings.load()

        // Setup Combine pipelines
        setupPipelines()
    }

    // MARK: - Public Methods

    /// Start Omen session
    func startSession() async {
        do {
            // Request microphone permission
            let hasPermission = await audioEngine.requestPermission()
            guard hasPermission else {
                throw OmenError.microphonePermissionDenied
            }

            // Start services
            try await audioEngine.start()
            try await openAIService.connect(targetLanguage: settings.targetLanguage.displayName)
            bluetoothManager.startScanning()

            isSessionActive = true
        } catch {
            handleError(error)
        }
    }

    /// Stop Omen session
    func stopSession() {
        audioEngine.stop()
        openAIService.disconnect()
        elevenLabsService.stop()

        isSessionActive = false
        openAIService.clearTranscripts()
    }

    /// Toggle session state
    func toggleSession() async {
        if isSessionActive {
            stopSession()
        } else {
            await startSession()
        }
    }

    // MARK: - Private Methods

    /// Setup Combine pipelines for service coordination
    private func setupPipelines() {
        // Audio → OpenAI pipeline
        audioEngine.onAudioBuffer = { [weak self] sample in
            Task {
                try? await self?.openAIService.sendAudio(sample)
            }
        }

        // Caption → BLE pipeline (100ms debounce)
        openAIService.$currentCaption
            .debounce(for: 0.1, scheduler: DispatchQueue.main)
            .sink { [weak self] caption in
                self?.bluetoothManager.writeText(caption)
            }
            .store(in: &cancellables)

        // Translation → BLE + TTS pipeline
        openAIService.$currentTranslation
            .debounce(for: 0.1, scheduler: DispatchQueue.main)
            .sink { [weak self] translation in
                guard let self = self else { return }

                // Send to wearable
                self.bluetoothManager.writeText(translation)

                // Speak aloud if TTS enabled
                if self.settings.enableTTS {
                    self.elevenLabsService.synthesizeAndSpeak(translation)
                }
            }
            .store(in: &cancellables)

        // Update TTS settings when changed
        settings.$enableTTS
            .assign(to: \.isEnabled, on: elevenLabsService)
            .store(in: &cancellables)

        settings.$ttsVoice
            .assign(to: \.currentVoice, on: elevenLabsService)
            .store(in: &cancellables)
    }

    /// Update services when settings change
    private func updateServices() {
        Task {
            // Reconnect OpenAI with new language
            if openAIService.isConnected {
                openAIService.disconnect()
                try? await openAIService.connect(targetLanguage: settings.targetLanguage.displayName)
            }

            // Update TTS settings
            elevenLabsService.isEnabled = settings.enableTTS
            elevenLabsService.currentVoice = settings.ttsVoice
        }
    }

    /// Handle errors
    private func handleError(_ error: Error) {
        print("Omen Error: \(error.localizedDescription)")
    }

    /// Check microphone permission status
    func checkMicrophonePermission() -> Bool {
        audioEngine.hasPermission
    }
}

// MARK: - Computed Properties

extension OmenViewModel {
    /// Overall system status message
    var statusMessage: String {
        if isSessionActive {
            return "Session Active"
        } else if !audioEngine.hasPermission {
            return "Microphone Permission Required"
        } else {
            return "Ready to Start"
        }
    }

    /// Detailed status for debugging
    var detailedStatus: String {
        """
        OpenAI: \(openAIService.isConnected ? "Connected" : "Disconnected")
        BLE: \(bluetoothManager.connectionStatus.rawValue)
        TTS: \(elevenLabsService.isSpeaking ? "Speaking" : "Ready")
        Audio: \(audioEngine.isRunning ? "Running" : "Stopped")
        """
    }
}

// MARK: - Errors

enum OmenError: LocalizedError {
    case microphonePermissionDenied
    case bluetoothUnavailable
    case apiKeyMissing

    var errorDescription: String? {
        switch self {
        case .microphonePermissionDenied:
            return "Microphone permission is required to use Omen"
        case .bluetoothUnavailable:
            return "Bluetooth is unavailable"
        case .apiKeyMissing:
            return "API keys not configured"
        }
    }
}
