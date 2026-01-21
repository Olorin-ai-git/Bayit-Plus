import SwiftUI
import AVFoundation

/// Permissions request view for microphone and Bluetooth
struct PermissionsView: View {
    @ObservedObject var coordinator: AppCoordinator
    @State private var microphonePermission: PermissionStatus = .notDetermined
    @State private var bluetoothPermission: PermissionStatus = .notDetermined
    @State private var isCheckingPermissions = false

    var body: some View {
        VStack(spacing: 0) {
            // Header
            VStack(spacing: 16) {
                Image(systemName: "checkmark.shield.fill")
                    .font(.system(size: 80))
                    .foregroundColor(.green)

                Text("Permissions Required")
                    .font(.system(size: 32, weight: .bold))
                    .foregroundColor(.white)

                Text("Omen needs access to your microphone and Bluetooth to provide real-time translation.")
                    .font(.body)
                    .foregroundColor(.white.opacity(0.8))
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 32)
            }
            .padding(.top, 80)

            Spacer()

            // Permission cards
            VStack(spacing: 20) {
                PermissionCard(
                    icon: "mic.fill",
                    title: "Microphone Access",
                    description: "Required to capture your voice for transcription and translation.",
                    status: microphonePermission,
                    action: requestMicrophonePermission
                )

                PermissionCard(
                    icon: "antenna.radiowaves.left.and.right",
                    title: "Bluetooth Access",
                    description: "Optional for connecting to your ESP32 wearable display.",
                    status: bluetoothPermission,
                    action: requestBluetoothPermission
                )
            }
            .padding(.horizontal, 24)

            Spacer()

            // Continue button
            Button(action: {
                if microphonePermission == .authorized {
                    coordinator.completePermissions()
                }
            }) {
                HStack {
                    Text("Continue")
                        .fontWeight(.semibold)
                    Image(systemName: "arrow.right.circle.fill")
                }
                .frame(maxWidth: .infinity)
                .padding()
                .background(microphonePermission == .authorized ? Color.blue : Color.gray)
                .foregroundColor(.white)
                .cornerRadius(16)
            }
            .disabled(microphonePermission != .authorized)
            .padding(.horizontal, 32)
            .padding(.bottom, 50)
        }
        .background(Color.black.ignoresSafeArea())
        .onAppear {
            checkCurrentPermissions()
        }
    }

    // MARK: - Permission Checks
    private func checkCurrentPermissions() {
        // Check microphone
        switch AVAudioSession.sharedInstance().recordPermission {
        case .granted:
            microphonePermission = .authorized
        case .denied:
            microphonePermission = .denied
        case .undetermined:
            microphonePermission = .notDetermined
        @unknown default:
            microphonePermission = .notDetermined
        }

        // Bluetooth permission is checked when scanning
        bluetoothPermission = .notDetermined
    }

    private func requestMicrophonePermission() {
        isCheckingPermissions = true

        AVAudioSession.sharedInstance().requestRecordPermission { granted in
            DispatchQueue.main.async {
                microphonePermission = granted ? .authorized : .denied
                isCheckingPermissions = false
            }
        }
    }

    private func requestBluetoothPermission() {
        // Bluetooth permission is requested when scanning starts
        bluetoothPermission = .authorized
    }
}

// MARK: - Permission Card
struct PermissionCard: View {
    let icon: String
    let title: String
    let description: String
    let status: PermissionStatus
    let action: () -> Void

    var body: some View {
        VStack(spacing: 16) {
            HStack(spacing: 16) {
                Image(systemName: icon)
                    .font(.title)
                    .foregroundColor(statusColor)
                    .frame(width: 50, height: 50)
                    .background(statusColor.opacity(0.2))
                    .cornerRadius(12)

                VStack(alignment: .leading, spacing: 4) {
                    Text(title)
                        .font(.headline)
                        .foregroundColor(.white)

                    Text(description)
                        .font(.caption)
                        .foregroundColor(.white.opacity(0.7))
                        .lineLimit(2)
                }

                Spacer()
            }

            // Action button
            Button(action: action) {
                HStack {
                    Image(systemName: statusIcon)
                    Text(statusText)
                        .fontWeight(.medium)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 12)
                .background(statusColor.opacity(0.2))
                .foregroundColor(statusColor)
                .cornerRadius(10)
            }
            .disabled(status == .authorized)
        }
        .padding()
        .background(.ultraThinMaterial)
        .cornerRadius(20)
    }

    private var statusColor: Color {
        switch status {
        case .notDetermined: return .blue
        case .authorized: return .green
        case .denied: return .red
        }
    }

    private var statusIcon: String {
        switch status {
        case .notDetermined: return "hand.tap.fill"
        case .authorized: return "checkmark.circle.fill"
        case .denied: return "xmark.circle.fill"
        }
    }

    private var statusText: String {
        switch status {
        case .notDetermined: return "Grant Permission"
        case .authorized: return "Authorized"
        case .denied: return "Denied - Open Settings"
        }
    }
}

// MARK: - Permission Status
enum PermissionStatus {
    case notDetermined
    case authorized
    case denied
}
