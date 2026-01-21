import SwiftUI

/// Main dashboard view
struct ContentView: View {
    @StateObject private var viewModel = OmenViewModel()
    @State private var showSettings = false

    var body: some View {
        NavigationStack {
            ZStack {
                // Background
                Color(.systemGroupedBackground)
                    .ignoresSafeArea()

                VStack(spacing: 24) {
                    // Live Indicator
                    if viewModel.isSessionActive {
                        liveIndicator
                            .padding(.top)
                    }

                    // Waveform Visualizer
                    WaveformVisualizer(audioLevel: viewModel.audioEngine.audioLevel)
                        .padding(.horizontal)
                        .background(
                            RoundedRectangle(cornerRadius: 16)
                                .fill(Color.black)
                                .shadow(color: .black.opacity(0.2), radius: 8, x: 0, y: 4)
                        )
                        .padding(.horizontal)

                    // Dual Text View
                    DualTextView(
                        caption: viewModel.openAIService.currentCaption,
                        translation: viewModel.openAIService.currentTranslation,
                        targetLanguage: viewModel.settings.targetLanguage.displayName
                    )

                    Spacer()

                    // Status Indicators
                    statusIndicators

                    // Main Control Button
                    controlButton

                    // Settings Button
                    settingsButton
                }
                .padding(.bottom)
            }
            .navigationBarHidden(true)
            .sheet(isPresented: $showSettings) {
                SettingsView(viewModel: viewModel)
            }
        }
    }

    // MARK: - View Components

    /// Live indicator badge
    private var liveIndicator: some View {
        HStack(spacing: 8) {
            Circle()
                .fill(Color.red)
                .frame(width: 12, height: 12)
                .shadow(color: .red, radius: 4)

            Text("LIVE")
                .font(.system(.headline, design: .rounded))
                .fontWeight(.bold)
                .foregroundColor(.red)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 8)
        .background(
            Capsule()
                .fill(Color.red.opacity(0.1))
                .overlay(
                    Capsule()
                        .strokeBorder(Color.red, lineWidth: 2)
                )
        )
        .animation(.easeInOut(duration: 1.0).repeatForever(autoreverses: true), value: viewModel.isSessionActive)
    }

    /// Status indicators row
    private var statusIndicators: some View {
        HStack(spacing: 20) {
            // OpenAI Status
            StatusBadge(
                icon: "network",
                text: "OpenAI",
                isActive: viewModel.openAIService.isConnected
            )

            // Bluetooth Status
            StatusBadge(
                icon: "antenna.radiowaves.left.and.right",
                text: "BLE",
                isActive: viewModel.bluetoothManager.connectionStatus == .connected
            )

            // TTS Status
            if viewModel.settings.enableTTS {
                StatusBadge(
                    icon: "speaker.wave.2",
                    text: "TTS",
                    isActive: viewModel.elevenLabsService.isEnabled
                )
            }
        }
        .padding(.horizontal)
    }

    /// Main control button
    private var controlButton: some View {
        Button {
            Task {
                await viewModel.toggleSession()
            }
        } label: {
            HStack {
                Image(systemName: viewModel.isSessionActive ? "stop.fill" : "play.fill")
                    .font(.title2)

                Text(viewModel.isSessionActive ? "Stop Session" : "Start Session")
                    .font(.title3)
                    .fontWeight(.semibold)
            }
            .frame(maxWidth: .infinity)
            .padding()
            .background(
                RoundedRectangle(cornerRadius: 16)
                    .fill(viewModel.isSessionActive ? Color.red : Color.blue)
                    .shadow(color: (viewModel.isSessionActive ? Color.red : Color.blue).opacity(0.3), radius: 8, x: 0, y: 4)
            )
            .foregroundColor(.white)
        }
        .padding(.horizontal)
        .disabled(!viewModel.checkMicrophonePermission() && !viewModel.isSessionActive)
    }

    /// Settings button
    private var settingsButton: some View {
        Button {
            showSettings = true
        } label: {
            HStack {
                Image(systemName: "gearshape")
                Text("Settings")
            }
            .font(.headline)
            .foregroundColor(.secondary)
        }
    }
}

// MARK: - Status Badge Component

struct StatusBadge: View {
    let icon: String
    let text: String
    let isActive: Bool

    var body: some View {
        HStack(spacing: 6) {
            Image(systemName: icon)
                .font(.caption)

            Text(text)
                .font(.caption)
                .fontWeight(.medium)
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 6)
        .background(
            Capsule()
                .fill(isActive ? Color.green.opacity(0.2) : Color.gray.opacity(0.2))
        )
        .foregroundColor(isActive ? .green : .secondary)
        .overlay(
            Capsule()
                .strokeBorder(isActive ? Color.green : Color.gray.opacity(0.3), lineWidth: 1)
        )
    }
}

// MARK: - Preview

#Preview {
    ContentView()
}
