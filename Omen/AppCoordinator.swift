import SwiftUI
import Combine
import AVFoundation

/// Central coordinator managing app-wide state and navigation
class AppCoordinator: ObservableObject {
    // MARK: - Published State
    @Published var currentScreen: AppScreen = .loading
    @Published var hasCompletedOnboarding: Bool = false
    @Published var hasGrantedPermissions: Bool = false
    @Published var isSessionActive: Bool = false

    // MARK: - Services (Singleton instances)
    let audioEngine: AudioEngine
    let openAIService: OpenAIService
    let elevenLabsService: ElevenLabsService
    let bluetoothManager: BluetoothManager
    let settingsManager: SettingsManager
    let sessionHistoryManager: SessionHistoryManager

    // MARK: - Cancellables
    private var cancellables = Set<AnyCancellable>()

    // MARK: - Initialization
    init() {
        // Initialize services
        let openAIKey = Bundle.main.infoDictionary?["OpenAIAPIKey"] as? String ?? ""
        let elevenLabsKey = Bundle.main.infoDictionary?["ElevenLabsAPIKey"] as? String ?? ""

        self.audioEngine = AudioEngine()
        self.openAIService = OpenAIService(apiKey: openAIKey)
        self.elevenLabsService = ElevenLabsService(apiKey: elevenLabsKey)
        self.bluetoothManager = BluetoothManager()
        self.settingsManager = SettingsManager()
        self.sessionHistoryManager = SessionHistoryManager()

        // Load saved state
        loadPersistedState()

        // Determine initial screen
        determineInitialScreen()
    }

    // MARK: - Navigation
    func navigate(to screen: AppScreen) {
        withAnimation(.easeInOut(duration: 0.3)) {
            currentScreen = screen
        }
    }

    func completeOnboarding() {
        hasCompletedOnboarding = true
        UserDefaults.standard.set(true, forKey: "hasCompletedOnboarding")
        navigate(to: .permissions)
    }

    func completePermissions() {
        hasGrantedPermissions = true
        navigate(to: .main)
    }

    func startNewSession() {
        isSessionActive = true
        navigate(to: .session)
    }

    func endSession() {
        isSessionActive = false
        navigate(to: .main)
    }

    func openSettings() {
        navigate(to: .settings)
    }

    func openBluetoothPairing() {
        navigate(to: .bluetoothPairing)
    }

    func openLanguageSelection() {
        navigate(to: .languageSelection)
    }

    func openSessionHistory() {
        navigate(to: .sessionHistory)
    }

    // MARK: - State Management
    private func loadPersistedState() {
        hasCompletedOnboarding = UserDefaults.standard.bool(forKey: "hasCompletedOnboarding")
        hasGrantedPermissions = checkPermissions()
    }

    private func determineInitialScreen() {
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) { [weak self] in
            guard let self = self else { return }

            if !self.hasCompletedOnboarding {
                self.navigate(to: .onboarding)
            } else if !self.hasGrantedPermissions {
                self.navigate(to: .permissions)
            } else {
                self.navigate(to: .main)
            }
        }
    }

    private func checkPermissions() -> Bool {
        let micPermission = AVAudioSession.sharedInstance().recordPermission == .granted
        return micPermission
    }
}

// MARK: - App Screens
enum AppScreen {
    case loading
    case onboarding
    case permissions
    case main
    case session
    case settings
    case bluetoothPairing
    case languageSelection
    case sessionHistory
}
