import SwiftUI

/// Settings view for configuring Omen
struct SettingsView: View {
    @ObservedObject var viewModel: OmenViewModel
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            Form {
                // Translation Settings Section
                Section {
                    Picker("Target Language", selection: $viewModel.settings.targetLanguage) {
                        ForEach(TranslationSettings.Language.allCases, id: \.self) { language in
                            Text(language.displayName).tag(language)
                        }
                    }
                } header: {
                    Label("Translation", systemImage: "character.bubble")
                } footer: {
                    Text("Select the language to translate your speech into.")
                }

                // Text-to-Speech Settings Section
                Section {
                    Toggle("Enable Text-to-Speech", isOn: $viewModel.settings.enableTTS)

                    if viewModel.settings.enableTTS {
                        Picker("Voice", selection: $viewModel.settings.ttsVoice) {
                            ForEach(TranslationSettings.TTSVoice.allCases, id: \.self) { voice in
                                Text(voice.displayName).tag(voice)
                            }
                        }

                        HStack {
                            Image(systemName: viewModel.elevenLabsService.isSpeaking ? "speaker.wave.3" : "speaker")
                                .foregroundColor(viewModel.elevenLabsService.isSpeaking ? .green : .secondary)
                            Text("Status")
                            Spacer()
                            Text(viewModel.elevenLabsService.isSpeaking ? "Speaking" : "Ready")
                                .foregroundColor(.secondary)
                        }
                    }
                } header: {
                    Label("Text-to-Speech", systemImage: "speaker.wave.2")
                } footer: {
                    Text("Speak translations aloud using ElevenLabs AI voices.")
                }

                // Bluetooth Settings Section
                Section {
                    HStack {
                        Image(systemName: bluetoothIcon)
                            .foregroundColor(bluetoothColor)
                        Text("Status")
                        Spacer()
                        Text(viewModel.bluetoothManager.connectionStatus.rawValue)
                            .foregroundColor(.secondary)
                    }

                    if viewModel.bluetoothManager.connectionStatus != .connected {
                        Button {
                            if viewModel.bluetoothManager.isScanning {
                                viewModel.bluetoothManager.stopScanning()
                            } else {
                                viewModel.bluetoothManager.startScanning()
                            }
                        } label: {
                            Label(
                                viewModel.bluetoothManager.isScanning ? "Stop Scanning" : "Scan for Wearable",
                                systemImage: viewModel.bluetoothManager.isScanning ? "stop.circle" : "antenna.radiowaves.left.and.right"
                            )
                        }
                    } else {
                        Button(role: .destructive) {
                            viewModel.bluetoothManager.disconnect()
                        } label: {
                            Label("Disconnect", systemImage: "xmark.circle")
                        }
                    }
                } header: {
                    Label("Bluetooth", systemImage: "antenna.radiowaves.left.and.right")
                } footer: {
                    Text("Connect to your Omen ESP32 wearable to display captions.")
                }

                // API Status Section
                Section {
                    HStack {
                        Image(systemName: "key")
                        Text("OpenAI")
                        Spacer()
                        Image(systemName: viewModel.openAIService.isConnected ? "checkmark.circle.fill" : "circle")
                            .foregroundColor(viewModel.openAIService.isConnected ? .green : .secondary)
                    }

                    HStack {
                        Image(systemName: "key")
                        Text("ElevenLabs")
                        Spacer()
                        Image(systemName: "checkmark.circle.fill")
                            .foregroundColor(.green)
                    }
                } header: {
                    Label("API Keys", systemImage: "key.fill")
                } footer: {
                    Text("API keys are configured in Config.xcconfig")
                }

                // Device Info Section
                Section {
                    HStack {
                        Text("Device")
                        Spacer()
                        Text(UIDevice.current.modelName)
                            .foregroundColor(.secondary)
                    }

                    HStack {
                        Text("Action Button")
                        Spacer()
                        Image(systemName: UIDevice.current.supportsActionButton ? "checkmark.circle.fill" : "xmark.circle")
                            .foregroundColor(UIDevice.current.supportsActionButton ? .green : .secondary)
                    }

                    HStack {
                        Text("Version")
                        Spacer()
                        Text("1.0.0")
                            .foregroundColor(.secondary)
                    }
                } header: {
                    Label("Device Info", systemImage: "iphone")
                }
            }
            .navigationTitle("Settings")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") {
                        dismiss()
                    }
                }
            }
        }
    }

    // MARK: - Computed Properties

    private var bluetoothIcon: String {
        switch viewModel.bluetoothManager.connectionStatus {
        case .connected:
            return "checkmark.circle.fill"
        case .connecting, .scanning:
            return "arrow.triangle.2.circlepath"
        case .disconnected:
            return "circle"
        case .failed:
            return "exclamationmark.triangle"
        }
    }

    private var bluetoothColor: Color {
        switch viewModel.bluetoothManager.connectionStatus {
        case .connected:
            return .green
        case .connecting, .scanning:
            return .orange
        case .disconnected:
            return .secondary
        case .failed:
            return .red
        }
    }
}

// MARK: - Preview

#Preview {
    SettingsView(viewModel: OmenViewModel())
}
