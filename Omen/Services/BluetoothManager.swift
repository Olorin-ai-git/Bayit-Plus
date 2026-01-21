import CoreBluetooth
import Combine

/// Bluetooth Manager for ESP32 wearable communication
class BluetoothManager: NSObject, ObservableObject {
    // MARK: - Published Properties

    /// Whether currently scanning for peripherals
    @Published private(set) var isScanning = false

    /// Connected peripheral
    @Published private(set) var connectedPeripheral: CBPeripheral?

    /// Connection status
    @Published private(set) var connectionStatus: ConnectionStatus = .disconnected

    /// Error message
    @Published private(set) var errorMessage: String?

    // MARK: - Private Properties

    private var centralManager: CBCentralManager!
    private var txCharacteristic: CBCharacteristic?
    private let debouncer = Debouncer(delay: 0.1) // 100ms debounce
    private var pendingText: String?

    // MARK: - Connection Status

    enum ConnectionStatus: String {
        case disconnected = "Disconnected"
        case scanning = "Scanning..."
        case connecting = "Connecting..."
        case connected = "Connected"
        case failed = "Failed"
    }

    // MARK: - Initialization

    override init() {
        super.init()
        centralManager = CBCentralManager(delegate: self, queue: nil)
    }

    // MARK: - Public Methods

    /// Start scanning for ESP32 peripheral
    func startScanning() {
        guard centralManager.state == .poweredOn else {
            errorMessage = "Bluetooth is not available"
            return
        }

        guard !isScanning else { return }

        Task { @MainActor in
            isScanning = true
            connectionStatus = .scanning
            errorMessage = nil
        }

        centralManager.scanForPeripherals(
            withServices: [BLEConstants.serviceUUID],
            options: [CBCentralManagerScanOptionAllowDuplicatesKey: false]
        )
    }

    /// Stop scanning
    func stopScanning() {
        guard isScanning else { return }

        centralManager.stopScan()

        Task { @MainActor in
            isScanning = false
        }
    }

    /// Connect to a specific peripheral
    func connect(to peripheral: CBPeripheral) {
        Task { @MainActor in
            connectionStatus = .connecting
        }

        centralManager.connect(peripheral, options: nil)
    }

    /// Disconnect from current peripheral
    func disconnect() {
        guard let peripheral = connectedPeripheral else { return }

        centralManager.cancelPeripheralConnection(peripheral)

        Task { @MainActor in
            connectionStatus = .disconnected
            connectedPeripheral = nil
            txCharacteristic = nil
        }
    }

    /// Write text to ESP32
    func writeText(_ text: String) {
        guard let characteristic = txCharacteristic,
              let peripheral = connectedPeripheral else {
            return
        }

        // Debounce writes to prevent overwhelming BLE buffer
        debouncer.debounce { [weak self] in
            self?.performWrite(text, to: characteristic, on: peripheral)
        }
    }

    // MARK: - Private Methods

    /// Perform actual BLE write
    private func performWrite(
        _ text: String,
        to characteristic: CBCharacteristic,
        on peripheral: CBPeripheral
    ) {
        let truncated = text.prefix(BLEConstants.maxTextLength)
        guard let data = String(truncated).data(using: .utf8) else {
            return
        }

        peripheral.writeValue(
            data,
            for: characteristic,
            type: .withoutResponse
        )
    }

    /// Attempt reconnection to last known peripheral
    func reconnect() {
        if let peripheral = connectedPeripheral {
            connect(to: peripheral)
        } else {
            startScanning()
        }
    }
}

// MARK: - CBCentralManagerDelegate

extension BluetoothManager: CBCentralManagerDelegate {
    func centralManagerDidUpdateState(_ central: CBCentralManager) {
        switch central.state {
        case .poweredOn:
            break
        case .poweredOff:
            Task { @MainActor in
                errorMessage = "Bluetooth is turned off"
                connectionStatus = .disconnected
            }
        case .unauthorized:
            Task { @MainActor in
                errorMessage = "Bluetooth permission denied"
                connectionStatus = .failed
            }
        case .unsupported:
            Task { @MainActor in
                errorMessage = "Bluetooth is not supported"
                connectionStatus = .failed
            }
        default:
            break
        }
    }

    func centralManager(
        _ central: CBCentralManager,
        didDiscover peripheral: CBPeripheral,
        advertisementData: [String: Any],
        rssi RSSI: NSNumber
    ) {
        // Check if this is our ESP32
        let name = peripheral.name ?? advertisementData[CBAdvertisementDataLocalNameKey] as? String ?? ""

        if name == BLEConstants.peripheralName {
            stopScanning()
            connect(to: peripheral)
        }
    }

    func centralManager(
        _ central: CBCentralManager,
        didConnect peripheral: CBPeripheral
    ) {
        Task { @MainActor in
            connectedPeripheral = peripheral
            connectionStatus = .connected
            errorMessage = nil
        }

        peripheral.delegate = self
        peripheral.discoverServices([BLEConstants.serviceUUID])
    }

    func centralManager(
        _ central: CBCentralManager,
        didFailToConnect peripheral: CBPeripheral,
        error: Error?
    ) {
        Task { @MainActor in
            connectionStatus = .failed
            errorMessage = error?.localizedDescription ?? "Failed to connect"
        }
    }

    func centralManager(
        _ central: CBCentralManager,
        didDisconnectPeripheral peripheral: CBPeripheral,
        error: Error?
    ) {
        Task { @MainActor in
            connectionStatus = .disconnected
            connectedPeripheral = nil
            txCharacteristic = nil

            if let error = error {
                errorMessage = "Disconnected: \(error.localizedDescription)"
            }
        }

        // Attempt reconnection
        Task {
            try? await Task.sleep(nanoseconds: 2_000_000_000) // 2 seconds
            reconnect()
        }
    }
}

// MARK: - CBPeripheralDelegate

extension BluetoothManager: CBPeripheralDelegate {
    func peripheral(
        _ peripheral: CBPeripheral,
        didDiscoverServices error: Error?
    ) {
        if let error = error {
            Task { @MainActor in
                errorMessage = "Service discovery error: \(error.localizedDescription)"
            }
            return
        }

        guard let services = peripheral.services else { return }

        for service in services where service.uuid == BLEConstants.serviceUUID {
            peripheral.discoverCharacteristics(
                [BLEConstants.txCharacteristicUUID],
                for: service
            )
        }
    }

    func peripheral(
        _ peripheral: CBPeripheral,
        didDiscoverCharacteristicsFor service: CBService,
        error: Error?
    ) {
        if let error = error {
            Task { @MainActor in
                errorMessage = "Characteristic discovery error: \(error.localizedDescription)"
            }
            return
        }

        guard let characteristics = service.characteristics else { return }

        for characteristic in characteristics where characteristic.uuid == BLEConstants.txCharacteristicUUID {
            Task { @MainActor in
                txCharacteristic = characteristic
            }
        }
    }
}
