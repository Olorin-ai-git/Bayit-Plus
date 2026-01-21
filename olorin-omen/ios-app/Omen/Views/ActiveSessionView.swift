import SwiftUI

/// Active translation session view with real-time display
struct ActiveSessionView: View {
    @ObservedObject var coordinator: AppCoordinator
    @StateObject private var viewModel: SessionViewModel
    @State private var showingEndConfirmation = false

    init(coordinator: AppCoordinator) {
        self.coordinator = coordinator
        _viewModel = StateObject(wrappedValue: SessionViewModel(
            audioEngine: coordinator.audioEngine,
            openAIService: coordinator.openAIService,
            elevenLabsService: coordinator.elevenLabsService,
            bluetoothManager: coordinator.bluetoothManager,
            settingsManager: coordinator.settingsManager,
            sessionHistoryManager: coordinator.sessionHistoryManager
        ))
    }

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()

            VStack(spacing: 24) {
                // Header with controls
                header

                // Connection status
                connectionStatus

                // Waveform visualization
                waveformView

                // Dual text display
                textDisplay

                Spacer()

                // End session button
                endSessionButton
            }
            .padding()

            // Error overlay
            if let error = viewModel.errorMessage {
                errorOverlay(error)
            }
        }
        .onAppear {
            Task {
                await viewModel.startSession()
            }
        }
        .onDisappear {
            viewModel.stopSession()
        }
        .alert("End Session", isPresented: $showingEndConfirmation) {
            Button("Cancel", role: .cancel) { }
            Button("End Session", role: .destructive) {
                viewModel.stopSession()
                coordinator.endSession()
            }
        } message: {
            Text("Are you sure you want to end this translation session?")
        }
    }

    // MARK: - Header
    private var header: some View {
        HStack {
            Button(action: {
                showingEndConfirmation = true
            }) {
                Image(systemName: "chevron.left.circle.fill")
                    .font(.title)
                    .foregroundColor(.white)
            }

            Spacer()

            VStack(spacing: 4) {
                Text("Live Session")
                    .font(.headline)
                    .foregroundColor(.white)

                Text(viewModel.sessionDuration)
                    .font(.caption)
                    .foregroundColor(.white.opacity(0.7))
                    .monospacedDigit()
            }

            Spacer()

            // Settings indicator
            Text(coordinator.settingsManager.targetLanguage.flag)
                .font(.title)
        }
    }

    // MARK: - Connection Status
    private var connectionStatus: some View {
        HStack(spacing: 16) {
            StatusIndicator(
                isActive: viewModel.isConnectedToOpenAI,
                label: "OpenAI",
                icon: "waveform"
            )

            StatusIndicator(
                isActive: viewModel.isTTSActive,
                label: "TTS",
                icon: "speaker.wave.2"
            )

            StatusIndicator(
                isActive: coordinator.bluetoothManager.isConnected,
                label: "BLE",
                icon: "antenna.radiowaves.left.and.right"
            )
        }
        .padding()
        .background(.ultraThinMaterial)
        .cornerRadius(20)
    }

    // MARK: - Waveform
    private var waveformView: some View {
        VStack(spacing: 8) {
            Text("Audio Input")
                .font(.caption)
                .foregroundColor(.white.opacity(0.7))

            HStack(alignment: .center, spacing: 2) {
                ForEach(viewModel.waveformData.indices, id: \.self) { index in
                    RoundedRectangle(cornerRadius: 2)
                        .fill(
                            LinearGradient(
                                colors: [.blue, .cyan],
                                startPoint: .bottom,
                                endPoint: .top
                            )
                        )
                        .frame(width: 3, height: max(4, CGFloat(viewModel.waveformData[index]) * 60))
                        .animation(.easeInOut(duration: 0.1), value: viewModel.waveformData[index])
                }
            }
            .frame(height: 70)
        }
        .padding()
        .background(.ultraThinMaterial)
        .cornerRadius(20)
    }

    // MARK: - Text Display
    private var textDisplay: some View {
        VStack(spacing: 16) {
            // Original text
            TextCard(
                title: "Original (English)",
                text: viewModel.originalText.isEmpty ? "Speak to begin..." : viewModel.originalText,
                color: .blue,
                icon: "mic.fill"
            )

            // Translated text
            TextCard(
                title: "Translation (\(coordinator.settingsManager.targetLanguage.displayName))",
                text: viewModel.translatedText.isEmpty ? "Translation will appear here..." : viewModel.translatedText,
                color: .green,
                icon: "globe"
            )
        }
    }

    // MARK: - End Session Button
    private var endSessionButton: some View {
        Button(action: {
            showingEndConfirmation = true
        }) {
            HStack {
                Image(systemName: "stop.circle.fill")
                    .font(.title2)

                Text("End Session")
                    .font(.headline)
            }
            .frame(maxWidth: .infinity)
            .padding()
            .background(Color.red)
            .foregroundColor(.white)
            .cornerRadius(16)
        }
    }

    // MARK: - Error Overlay
    private func errorOverlay(_ message: String) -> some View {
        VStack {
            Spacer()

            HStack {
                Image(systemName: "exclamationmark.triangle.fill")
                    .foregroundColor(.white)

                Text(message)
                    .font(.body)
                    .foregroundColor(.white)

                Spacer()

                Button("Dismiss") {
                    viewModel.errorMessage = nil
                }
                .foregroundColor(.white)
                .fontWeight(.semibold)
            }
            .padding()
            .background(Color.red)
            .cornerRadius(12)
            .padding()
        }
        .transition(.move(edge: .bottom))
        .animation(.spring(), value: viewModel.errorMessage)
    }
}

// MARK: - Status Indicator
struct StatusIndicator: View {
    let isActive: Bool
    let label: String
    let icon: String

    var body: some View {
        HStack(spacing: 6) {
            Image(systemName: icon)
                .font(.caption)
                .foregroundColor(isActive ? .green : .gray)

            Text(label)
                .font(.caption2)
                .fontWeight(.medium)
                .foregroundColor(.white)

            Circle()
                .fill(isActive ? Color.green : Color.gray)
                .frame(width: 8, height: 8)
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
        .background(isActive ? Color.green.opacity(0.2) : Color.gray.opacity(0.2))
        .cornerRadius(20)
    }
}

// MARK: - Text Card
struct TextCard: View {
    let title: String
    let text: String
    let color: Color
    let icon: String

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 8) {
                Image(systemName: icon)
                    .font(.caption)
                    .foregroundColor(color)

                Text(title)
                    .font(.caption)
                    .fontWeight(.semibold)
                    .foregroundColor(color)
                    .textCase(.uppercase)
            }

            ScrollView {
                Text(text)
                    .font(.body)
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }
            .frame(minHeight: 100, maxHeight: 150)
        }
        .padding()
        .background(.ultraThinMaterial)
        .cornerRadius(16)
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(color.opacity(0.3), lineWidth: 1)
        )
    }
}

// MARK: - Session ViewModel
class SessionViewModel: ObservableObject {
    @Published var originalText: String = ""
    @Published var translatedText: String = ""
    @Published var isConnectedToOpenAI: Bool = false
    @Published var isTTSActive: Bool = false
    @Published var waveformData: [Float] = Array(repeating: 0.0, count: 30)
    @Published var errorMessage: String?
    @Published var sessionDuration: String = "00:00"

    private let audioEngine: AudioEngine
    private let openAIService: OpenAIService
    private let elevenLabsService: ElevenLabsService
    private let bluetoothManager: BluetoothManager
    private let settingsManager: SettingsManager
    private let sessionHistoryManager: SessionHistoryManager

    private var cancellables = Set<AnyCancellable>()
    private var session: TranslationSession?
    private var sessionTimer: Timer?
    private var sessionStartTime: Date?

    init(
        audioEngine: AudioEngine,
        openAIService: OpenAIService,
        elevenLabsService: ElevenLabsService,
        bluetoothManager: BluetoothManager,
        settingsManager: SettingsManager,
        sessionHistoryManager: SessionHistoryManager
    ) {
        self.audioEngine = audioEngine
        self.openAIService = openAIService
        self.elevenLabsService = elevenLabsService
        self.bluetoothManager = bluetoothManager
        self.settingsManager = settingsManager
        self.sessionHistoryManager = sessionHistoryManager

        setupBindings()
    }

    private func setupBindings() {
        // Transcription updates
        openAIService.transcriptionPublisher
            .receive(on: DispatchQueue.main)
            .assign(to: &$originalText)

        // Translation updates
        openAIService.translationPublisher
            .debounce(for: .milliseconds(100), scheduler: DispatchQueue.main)
            .removeDuplicates()
            .receive(on: DispatchQueue.main)
            .sink { [weak self] translation in
                guard let self = self else { return }
                self.translatedText = translation
                self.session?.addTranscript(original: self.originalText, translation: translation)
                self.sendToBluetoothAndSpeak(translation)
            }
            .store(in: &cancellables)

        // Connection state
        openAIService.connectionStatePublisher
            .receive(on: DispatchQueue.main)
            .assign(to: &$isConnectedToOpenAI)

        // TTS state
        elevenLabsService.audioPlaybackPublisher
            .receive(on: DispatchQueue.main)
            .assign(to: &$isTTSActive)

        // Waveform updates
        audioEngine.audioSamplesPublisher
            .throttle(for: .milliseconds(50), scheduler: DispatchQueue.main, latest: true)
            .map { samples -> [Float] in
                let barCount = 30
                let samplesPerBar = max(1, samples.count / barCount)

                return (0..<barCount).map { barIndex in
                    let start = barIndex * samplesPerBar
                    let end = min(start + samplesPerBar, samples.count)
                    guard end > start else { return 0.0 }

                    let chunk = Array(samples[start..<end])
                    let rms = sqrt(chunk.map { $0 * $0 }.reduce(0, +) / Float(chunk.count))
                    let db = 20 * log10(max(rms, 0.00001))
                    let normalized = (db + 60.0) / 60.0
                    return max(0.0, min(1.0, normalized))
                }
            }
            .receive(on: DispatchQueue.main)
            .assign(to: &$waveformData)

        // Stream audio to OpenAI
        audioEngine.audioDataPublisher
            .sink { [weak self] audioData in
                guard let self = self, self.isConnectedToOpenAI else { return }
                Task {
                    try? await self.openAIService.sendAudioChunk(audioData)
                }
            }
            .store(in: &cancellables)
    }

    @MainActor
    func startSession() async {
        guard !isConnectedToOpenAI else { return }

        errorMessage = nil
        sessionStartTime = Date()

        do {
            try await openAIService.connect()
            try audioEngine.start()

            // Create session record
            var newSession = sessionHistoryManager.createSession()
            newSession.targetLanguage = settingsManager.targetLanguage.displayName
            self.session = newSession

            // Start timer
            startSessionTimer()
        } catch {
            errorMessage = "Failed to start session: \(error.localizedDescription)"
        }
    }

    @MainActor
    func stopSession() {
        openAIService.disconnect()
        audioEngine.stop()
        elevenLabsService.stop()

        session?.endSession()
        if var finalSession = session {
            sessionHistoryManager.saveSession(finalSession)
        }

        sessionTimer?.invalidate()
        sessionTimer = nil
    }

    private func sendToBluetoothAndSpeak(_ text: String) {
        bluetoothManager.sendText(text)

        if settingsManager.isTTSEnabled {
            Task {
                try? await elevenLabsService.synthesize(
                    text: text,
                    voice: settingsManager.selectedVoice.voiceId
                )
            }
        }
    }

    private func startSessionTimer() {
        sessionTimer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { [weak self] _ in
            guard let self = self, let startTime = self.sessionStartTime else { return }

            let duration = Date().timeIntervalSince(startTime)
            let minutes = Int(duration) / 60
            let seconds = Int(duration) % 60

            DispatchQueue.main.async {
                self.sessionDuration = String(format: "%02d:%02d", minutes, seconds)
            }
        }
    }
}
