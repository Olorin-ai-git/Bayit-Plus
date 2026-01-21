import SwiftUI
import CoreBluetooth

/// Bluetooth device scanning and pairing view
struct BluetoothPairingView: View {
    @ObservedObject var coordinator: AppCoordinator
    @State private var isScanning = false

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()

            VStack(spacing: 24) {
                // Header
                header

                // Connection status
                if coordinator.bluetoothManager.isConnected {
                    connectedDeviceCard
                } else {
                    // Instructions
                    instructionsCard

                    // Discovered devices
                    devicesList

                    Spacer()

                    // Scan button
                    scanButton
                }
            }
            .padding()
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

            Text("Bluetooth Wearable")
                .font(.title2)
                .fontWeight(.bold)
                .foregroundColor(.white)

            Spacer()

            if coordinator.bluetoothManager.isConnected {
                Button(action: {
                    coordinator.bluetoothManager.disconnect()
                }) {
                    Image(systemName: "xmark.circle.fill")
                        .font(.title)
                        .foregroundColor(.red)
                }
            } else {
                Color.clear
                    .frame(width: 40, height: 40)
            }
        }
    }

    // MARK: - Connected Device Card
    private var connectedDeviceCard: some View {
        VStack(spacing: 24) {
            Image(systemName: "checkmark.circle.fill")
                .font(.system(size: 80))
                .foregroundColor(.green)

            VStack(spacing: 8) {
                Text("Connected")
                    .font(.title)
                    .fontWeight(.bold)
                    .foregroundColor(.white)

                if let peripheral = coordinator.bluetoothManager.connectedPeripheral {
                    Text(peripheral.name ?? "Unknown Device")
                        .font(.title3)
                        .foregroundColor(.white.opacity(0.7))
                }
            }

            VStack(spacing: 12) {
                ConnectionInfoRow(
                    icon: "antenna.radiowaves.left.and.right",
                    label: "Signal",
                    value: "Strong"
                )

                ConnectionInfoRow(
                    icon: "bolt.fill",
                    label: "Status",
                    value: "Active"
                )

                ConnectionInfoRow(
                    icon: "app.connected.to.app.below.fill",
                    label: "Service",
                    value: "UART"
                )
            }
            .padding()
            .background(.ultraThinMaterial)
            .cornerRadius(16)

            Button(action: {
                coordinator.bluetoothManager.disconnect()
            }) {
                HStack {
                    Image(systemName: "xmark.circle.fill")
                    Text("Disconnect")
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

    // MARK: - Instructions Card
    private var instructionsCard: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack(spacing: 8) {
                Image(systemName: "lightbulb.fill")
                    .foregroundColor(.yellow)

                Text("Setup Instructions")
                    .font(.headline)
                    .foregroundColor(.white)
            }

            VStack(alignment: .leading, spacing: 12) {
                InstructionStep(number: 1, text: "Power on your ESP32 wearable device")
                InstructionStep(number: 2, text: "Ensure it's advertising as 'Omen_ESP32'")
                InstructionStep(number: 3, text: "Tap 'Scan for Devices' below")
                InstructionStep(number: 4, text: "Select your device from the list")
            }
        }
        .padding()
        .background(.ultraThinMaterial)
        .cornerRadius(16)
    }

    // MARK: - Devices List
    private var devicesList: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Available Devices")
                .font(.headline)
                .foregroundColor(.white)

            if isScanning {
                HStack {
                    ProgressView()
                        .progressViewStyle(CircularProgressViewStyle(tint: .white))

                    Text("Scanning...")
                        .foregroundColor(.white.opacity(0.7))

                    Spacer()
                }
                .padding()
                .background(.ultraThinMaterial)
                .cornerRadius(16)
            } else if coordinator.bluetoothManager.discoveredDevices.isEmpty {
                VStack(spacing: 12) {
                    Image(systemName: "wifi.slash")
                        .font(.title)
                        .foregroundColor(.white.opacity(0.5))

                    Text("No devices found")
                        .foregroundColor(.white.opacity(0.7))

                    Text("Make sure your ESP32 is powered on and advertising")
                        .font(.caption)
                        .foregroundColor(.white.opacity(0.5))
                        .multilineTextAlignment(.center)
                }
                .frame(maxWidth: .infinity)
                .padding()
                .background(.ultraThinMaterial)
                .cornerRadius(16)
            } else {
                ScrollView {
                    VStack(spacing: 12) {
                        ForEach(coordinator.bluetoothManager.discoveredDevices, id: \.identifier) { device in
                            DeviceRow(device: device) {
                                coordinator.bluetoothManager.connect(to: device)
                            }
                        }
                    }
                }
                .frame(maxHeight: 300)
            }
        }
    }

    // MARK: - Scan Button
    private var scanButton: some View {
        Button(action: {
            if isScanning {
                coordinator.bluetoothManager.stopScanning()
                isScanning = false
            } else {
                coordinator.bluetoothManager.startScanning()
                isScanning = true

                // Auto-stop after 10 seconds
                DispatchQueue.main.asyncAfter(deadline: .now() + 10) {
                    if isScanning {
                        coordinator.bluetoothManager.stopScanning()
                        isScanning = false
                    }
                }
            }
        }) {
            HStack {
                Image(systemName: isScanning ? "stop.circle.fill" : "antenna.radiowaves.left.and.right")
                    .font(.title2)

                Text(isScanning ? "Stop Scanning" : "Scan for Devices")
                    .font(.headline)
            }
            .frame(maxWidth: .infinity)
            .padding()
            .background(isScanning ? Color.red : Color.blue)
            .foregroundColor(.white)
            .cornerRadius(16)
        }
    }
}

// MARK: - Device Row
struct DeviceRow: View {
    let device: CBPeripheral
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack {
                Image(systemName: "waveform.badge.ellipsis")
                    .font(.title2)
                    .foregroundColor(.cyan)

                VStack(alignment: .leading, spacing: 4) {
                    Text(device.name ?? "Unknown Device")
                        .font(.body)
                        .fontWeight(.semibold)
                        .foregroundColor(.white)

                    Text(device.identifier.uuidString)
                        .font(.caption)
                        .foregroundColor(.white.opacity(0.5))
                        .lineLimit(1)
                }

                Spacer()

                Image(systemName: "chevron.right")
                    .foregroundColor(.white.opacity(0.5))
            }
            .padding()
            .background(.ultraThinMaterial)
            .cornerRadius(12)
        }
    }
}

// MARK: - Instruction Step
struct InstructionStep: View {
    let number: Int
    let text: String

    var body: some View {
        HStack(spacing: 12) {
            Text("\(number)")
                .font(.caption)
                .fontWeight(.bold)
                .foregroundColor(.black)
                .frame(width: 24, height: 24)
                .background(Color.yellow)
                .clipShape(Circle())

            Text(text)
                .font(.callout)
                .foregroundColor(.white)
        }
    }
}

// MARK: - Connection Info Row
struct ConnectionInfoRow: View {
    let icon: String
    let label: String
    let value: String

    var body: some View {
        HStack {
            Image(systemName: icon)
                .foregroundColor(.cyan)

            Text(label)
                .foregroundColor(.white)

            Spacer()

            Text(value)
                .foregroundColor(.white.opacity(0.7))
        }
    }
}
