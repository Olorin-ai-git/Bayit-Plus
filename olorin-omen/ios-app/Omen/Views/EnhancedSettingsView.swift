import SwiftUI

/// Comprehensive settings view
struct EnhancedSettingsView: View {
    @ObservedObject var coordinator: AppCoordinator
    @State private var showingResetConfirmation = false

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()

            VStack(spacing: 0) {
                // Header
                header

                ScrollView {
                    VStack(spacing: 24) {
                        // Translation settings
                        translationSection

                        // Audio settings
                        audioSection

                        // Device settings
                        deviceSection

                        // App settings
                        appSection

                        // About section
                        aboutSection

                        // Reset button
                        resetButton
                    }
                    .padding()
                }
            }
        }
        .alert("Reset All Settings", isPresented: $showingResetConfirmation) {
            Button("Cancel", role: .cancel) { }
            Button("Reset", role: .destructive) {
                coordinator.settingsManager.resetToDefaults()
            }
        } message: {
            Text("This will reset all settings to their default values. This action cannot be undone.")
        }
    }

    // MARK: - Header
    private var header: some View {
        HStack {
            Button(action: {
                coordinator.navigate(to: .main)
            }) {
                Image(systemName: "chevron.left.circle.fill")
                    .font(.title)
                    .foregroundColor(.white)
            }

            Spacer()

            Text("Settings")
                .font(.title2)
                .fontWeight(.bold)
                .foregroundColor(.white)

            Spacer()

            // Placeholder for balance
            Color.clear
                .frame(width: 40, height: 40)
        }
        .padding()
    }

    // MARK: - Translation Section
    private var translationSection: some View {
        SettingsSection(title: "Translation", icon: "globe") {
            NavigationButton(
                icon: "flag.fill",
                title: "Target Language",
                value: "\(coordinator.settingsManager.targetLanguage.flag) \(coordinator.settingsManager.targetLanguage.displayName)",
                color: .blue
            ) {
                coordinator.openLanguageSelection()
            }
        }
    }

    // MARK: - Audio Section
    private var audioSection: some View {
        SettingsSection(title: "Audio", icon: "speaker.wave.3") {
            VStack(spacing: 16) {
                Toggle(isOn: $coordinator.settingsManager.isTTSEnabled) {
                    HStack {
                        Image(systemName: "speaker.wave.2.fill")
                            .foregroundColor(.purple)
                        Text("Text-to-Speech")
                            .foregroundColor(.white)
                    }
                }
                .tint(.purple)

                if coordinator.settingsManager.isTTSEnabled {
                    Divider()
                        .background(Color.white.opacity(0.2))

                    VStack(alignment: .leading, spacing: 12) {
                        Text("Voice")
                            .font(.caption)
                            .foregroundColor(.white.opacity(0.7))

                        ForEach(TTSVoice.allCases) { voice in
                            VoiceSelectionRow(
                                voice: voice,
                                isSelected: coordinator.settingsManager.selectedVoice == voice
                            ) {
                                coordinator.settingsManager.selectedVoice = voice
                            }
                        }
                    }
                }
            }
        }
    }

    // MARK: - Device Section
    private var deviceSection: some View {
        SettingsSection(title: "Devices", icon: "antenna.radiowaves.left.and.right") {
            NavigationButton(
                icon: "antenna.radiowaves.left.and.right",
                title: "Bluetooth Wearable",
                value: coordinator.bluetoothManager.isConnected ? "Connected" : "Not Connected",
                color: coordinator.bluetoothManager.isConnected ? .green : .gray
            ) {
                coordinator.openBluetoothPairing()
            }
        }
    }

    // MARK: - App Section
    private var appSection: some View {
        SettingsSection(title: "App", icon: "app.fill") {
            VStack(spacing: 16) {
                Toggle(isOn: $coordinator.settingsManager.autoStartOnActionButton) {
                    HStack {
                        Image(systemName: "hand.tap.fill")
                            .foregroundColor(.orange)
                        VStack(alignment: .leading, spacing: 2) {
                            Text("Action Button Auto-Start")
                                .foregroundColor(.white)
                            Text("Start sessions with Action Button (iPhone 15/16 Pro)")
                                .font(.caption)
                                .foregroundColor(.white.opacity(0.6))
                        }
                    }
                }
                .tint(.orange)

                Divider()
                    .background(Color.white.opacity(0.2))

                Toggle(isOn: $coordinator.settingsManager.vibrateOnTranslation) {
                    HStack {
                        Image(systemName: "iphone.radiowaves.left.and.right")
                            .foregroundColor(.pink)
                        Text("Vibrate on Translation")
                            .foregroundColor(.white)
                    }
                }
                .tint(.pink)
            }
        }
    }

    // MARK: - About Section
    private var aboutSection: some View {
        SettingsSection(title: "About", icon: "info.circle") {
            VStack(spacing: 12) {
                InfoRow(label: "Version", value: "1.0.0")
                Divider().background(Color.white.opacity(0.2))
                InfoRow(label: "Build", value: "1")
                Divider().background(Color.white.opacity(0.2))
                InfoRow(label: "Platform", value: "iOS 17.0+")
            }
        }
    }

    // MARK: - Reset Button
    private var resetButton: some View {
        Button(action: {
            showingResetConfirmation = true
        }) {
            HStack {
                Image(systemName: "arrow.clockwise.circle.fill")
                Text("Reset All Settings")
                    .fontWeight(.semibold)
            }
            .frame(maxWidth: .infinity)
            .padding()
            .background(Color.red.opacity(0.2))
            .foregroundColor(.red)
            .cornerRadius(16)
        }
    }
}

// MARK: - Settings Section
struct SettingsSection<Content: View>: View {
    let title: String
    let icon: String
    let content: Content

    init(title: String, icon: String, @ViewBuilder content: () -> Content) {
        self.title = title
        self.icon = icon
        self.content = content()
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack(spacing: 8) {
                Image(systemName: icon)
                    .font(.caption)
                    .foregroundColor(.blue)

                Text(title)
                    .font(.headline)
                    .foregroundColor(.white)
            }

            content
                .padding()
                .background(.ultraThinMaterial)
                .cornerRadius(16)
        }
    }
}

// MARK: - Navigation Button
struct NavigationButton: View {
    let icon: String
    let title: String
    let value: String
    let color: Color
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack {
                Image(systemName: icon)
                    .foregroundColor(color)

                Text(title)
                    .foregroundColor(.white)

                Spacer()

                Text(value)
                    .font(.callout)
                    .foregroundColor(.white.opacity(0.7))

                Image(systemName: "chevron.right")
                    .font(.caption)
                    .foregroundColor(.white.opacity(0.5))
            }
        }
    }
}

// MARK: - Voice Selection Row
struct VoiceSelectionRow: View {
    let voice: TTSVoice
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text(voice.displayName)
                        .font(.body)
                        .fontWeight(isSelected ? .semibold : .regular)
                        .foregroundColor(.white)

                    Text(voice.description)
                        .font(.caption)
                        .foregroundColor(.white.opacity(0.6))
                }

                Spacer()

                if isSelected {
                    Image(systemName: "checkmark.circle.fill")
                        .foregroundColor(.purple)
                }
            }
            .padding()
            .background(isSelected ? Color.purple.opacity(0.2) : Color.clear)
            .cornerRadius(12)
        }
    }
}

// MARK: - Info Row
struct InfoRow: View {
    let label: String
    let value: String

    var body: some View {
        HStack {
            Text(label)
                .foregroundColor(.white)

            Spacer()

            Text(value)
                .foregroundColor(.white.opacity(0.7))
        }
    }
}
