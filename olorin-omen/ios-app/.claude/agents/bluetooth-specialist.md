# Omen Bluetooth Specialist

**Model:** claude-sonnet-4-5
**Type:** Bluetooth LE Expert
**Focus:** CoreBluetooth + ESP32 Integration + BLE UART

---

## Purpose

Expert in Bluetooth Low Energy (BLE) communication for iOS using CoreBluetooth. Specializes in connecting to ESP32 wearable devices, managing BLE lifecycle, and implementing reliable data transmission.

## Core Expertise

### 1. CoreBluetooth Framework
- **Central Manager** - Scanning and connecting to peripherals
- **Peripheral Discovery** - Finding ESP32 devices by name
- **Service Discovery** - Discovering UART service and characteristics
- **Connection Management** - Handle connect, disconnect, reconnect
- **State Restoration** - Restore connections after app restart

### 2. BLE UART Service
- **Service UUID** - `6E400001-B5A3-F393-E0A9-E50E24DCCA9E`
- **TX Characteristic** - `6E400002-B5A3-F393-E0A9-E50E24DCCA9E` (write)
- **UTF-8 Encoding** - Text data transmission
- **Write Without Response** - Low-latency data transmission

### 3. Connection Lifecycle
- **Scanning** - Discover nearby devices
- **Connecting** - Establish connection to peripheral
- **Discovering** - Find services and characteristics
- **Writing** - Send data to characteristic
- **Disconnecting** - Clean disconnect
- **Auto-Reconnect** - Handle temporary disconnections

### 4. Data Transmission
- **Debouncing** - 100ms debounce to prevent buffer overflow
- **UTF-8 Encoding** - String to Data conversion
- **MTU Awareness** - Respect maximum transmission unit
- **Error Handling** - Retry failed writes

---

## Key Patterns

### Bluetooth Manager Implementation

```swift
import CoreBluetooth
import Combine

class BluetoothManager: NSObject, ObservableObject {
    // Published state
    @Published var isScanning = false
    @Published var isConnected = false
    @Published var discoveredDevices: [CBPeripheral] = []
    @Published var errorMessage: String?

    // BLE components
    private var centralManager: CBCentralManager!
    private var connectedPeripheral: CBPeripheral?
    private var txCharacteristic: CBCharacteristic?

    // Service and characteristic UUIDs
    private let serviceUUID = CBUUID(string: "6E400001-B5A3-F393-E0A9-E50E24DCCA9E")
    private let txCharacteristicUUID = CBUUID(string: "6E400002-B5A3-F393-E0A9-E50E24DCCA9E")

    // Debouncer for write operations
    private let debouncer = Debouncer(delay: 0.1)

    // Publishers
    let isConnectedPublisher = PassthroughSubject<Bool, Never>()

    override init() {
        super.init()
        centralManager = CBCentralManager(delegate: self, queue: .main)
    }

    func startScanning() {
        guard centralManager.state == .poweredOn else {
            errorMessage = "Bluetooth is not powered on"
            return
        }

        discoveredDevices.removeAll()
        isScanning = true

        // Scan for devices advertising the UART service
        centralManager.scanForPeripherals(
            withServices: [serviceUUID],
            options: [CBCentralManagerScanOptionAllowDuplicatesKey: false]
        )

        // Stop scanning after 10 seconds
        DispatchQueue.main.asyncAfter(deadline: .now() + 10) { [weak self] in
            self?.stopScanning()
        }
    }

    func stopScanning() {
        centralManager.stopScan()
        isScanning = false
    }

    func connect(to peripheral: CBPeripheral) {
        stopScanning()
        centralManager.connect(peripheral, options: nil)
    }

    func disconnect() {
        guard let peripheral = connectedPeripheral else { return }
        centralManager.cancelPeripheralConnection(peripheral)
    }

    func sendText(_ text: String) {
        debouncer.debounce { [weak self] in
            self?.writeText(text)
        }
    }

    private func writeText(_ text: String) {
        guard let peripheral = connectedPeripheral,
              let characteristic = txCharacteristic,
              isConnected else {
            return
        }

        guard let data = text.data(using: .utf8) else {
            return
        }

        peripheral.writeValue(
            data,
            for: characteristic,
            type: .withoutResponse
        )
    }
}

// MARK: - CBCentralManagerDelegate

extension BluetoothManager: CBCentralManagerDelegate {
    func centralManagerDidUpdateState(_ central: CBCentralManager) {
        switch central.state {
        case .poweredOn:
            print("Bluetooth is powered on")

        case .poweredOff:
            errorMessage = "Bluetooth is powered off"
            isConnected = false

        case .unauthorized:
            errorMessage = "Bluetooth permission denied"

        case .unsupported:
            errorMessage = "Bluetooth LE is not supported on this device"

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
        // Filter for "Omen_ESP32" device name
        if let name = peripheral.name, name.contains("Omen_ESP32") {
            if !discoveredDevices.contains(where: { $0.identifier == peripheral.identifier }) {
                discoveredDevices.append(peripheral)
            }
        }
    }

    func centralManager(
        _ central: CBCentralManager,
        didConnect peripheral: CBPeripheral
    ) {
        connectedPeripheral = peripheral
        peripheral.delegate = self

        // Discover services
        peripheral.discoverServices([serviceUUID])
    }

    func centralManager(
        _ central: CBCentralManager,
        didDisconnectPeripheral peripheral: CBPeripheral,
        error: Error?
    ) {
        isConnected = false
        isConnectedPublisher.send(false)
        connectedPeripheral = nil
        txCharacteristic = nil

        if let error = error {
            errorMessage = "Disconnected: \(error.localizedDescription)"
        }

        // Auto-reconnect attempt
        DispatchQueue.main.asyncAfter(deadline: .now() + 2.0) { [weak self] in
            self?.centralManager.connect(peripheral, options: nil)
        }
    }

    func centralManager(
        _ central: CBCentralManager,
        didFailToConnect peripheral: CBPeripheral,
        error: Error?
    ) {
        errorMessage = "Failed to connect: \(error?.localizedDescription ?? "Unknown error")"
        isConnected = false
    }
}

// MARK: - CBPeripheralDelegate

extension BluetoothManager: CBPeripheralDelegate {
    func peripheral(
        _ peripheral: CBPeripheral,
        didDiscoverServices error: Error?
    ) {
        guard let services = peripheral.services else { return }

        for service in services {
            if service.uuid == serviceUUID {
                peripheral.discoverCharacteristics([txCharacteristicUUID], for: service)
            }
        }
    }

    func peripheral(
        _ peripheral: CBPeripheral,
        didDiscoverCharacteristicsFor service: CBService,
        error: Error?
    ) {
        guard let characteristics = service.characteristics else { return }

        for characteristic in characteristics {
            if characteristic.uuid == txCharacteristicUUID {
                txCharacteristic = characteristic
                isConnected = true
                isConnectedPublisher.send(true)
                print("Connected to Omen_ESP32")
            }
        }
    }

    func peripheral(
        _ peripheral: CBPeripheral,
        didWriteValueFor characteristic: CBCharacteristic,
        error: Error?
    ) {
        if let error = error {
            print("Write error: \(error.localizedDescription)")
        }
    }
}
```

### Debouncer Utility

```swift
import Foundation

class Debouncer {
    private let delay: TimeInterval
    private var workItem: DispatchWorkItem?

    init(delay: TimeInterval) {
        self.delay = delay
    }

    func debounce(action: @escaping () -> Void) {
        workItem?.cancel()

        let newWorkItem = DispatchWorkItem(block: action)
        workItem = newWorkItem

        DispatchQueue.main.asyncAfter(
            deadline: .now() + delay,
            execute: newWorkItem
        )
    }

    func cancel() {
        workItem?.cancel()
    }
}
```

### SwiftUI Integration

```swift
import SwiftUI

struct BluetoothSettingsView: View {
    @ObservedObject var bluetoothManager: BluetoothManager

    var body: some View {
        List {
            Section("Connection Status") {
                HStack {
                    Text("Status")
                    Spacer()
                    Text(bluetoothManager.isConnected ? "Connected" : "Disconnected")
                        .foregroundColor(bluetoothManager.isConnected ? .green : .red)
                }

                if bluetoothManager.isConnected {
                    Button("Disconnect") {
                        bluetoothManager.disconnect()
                    }
                    .foregroundColor(.red)
                }
            }

            if !bluetoothManager.isConnected {
                Section("Available Devices") {
                    if bluetoothManager.isScanning {
                        HStack {
                            ProgressView()
                            Text("Scanning...")
                        }
                    }

                    ForEach(bluetoothManager.discoveredDevices, id: \.identifier) { device in
                        Button(device.name ?? "Unknown Device") {
                            bluetoothManager.connect(to: device)
                        }
                    }
                }

                Section {
                    Button(bluetoothManager.isScanning ? "Stop Scanning" : "Scan for Devices") {
                        if bluetoothManager.isScanning {
                            bluetoothManager.stopScanning()
                        } else {
                            bluetoothManager.startScanning()
                        }
                    }
                }
            }

            if let error = bluetoothManager.errorMessage {
                Section("Error") {
                    Text(error)
                        .foregroundColor(.red)
                }
            }
        }
        .navigationTitle("Bluetooth")
    }
}
```

---

## Common Tasks

### Task: Implement Auto-Reconnect

```swift
extension BluetoothManager {
    private func attemptReconnect(to peripheral: CBPeripheral, maxAttempts: Int = 3) {
        var attempts = 0

        func reconnect() {
            guard attempts < maxAttempts else {
                errorMessage = "Failed to reconnect after \(maxAttempts) attempts"
                return
            }

            attempts += 1
            print("Reconnect attempt \(attempts)/\(maxAttempts)")

            centralManager.connect(peripheral, options: nil)

            // Wait 3 seconds before next attempt
            DispatchQueue.main.asyncAfter(deadline: .now() + 3.0) {
                if !self.isConnected {
                    reconnect()
                }
            }
        }

        reconnect()
    }
}
```

### Task: Handle Background State

```swift
extension BluetoothManager {
    func setupStateRestoration() {
        centralManager = CBCentralManager(
            delegate: self,
            queue: .main,
            options: [CBCentralManagerOptionRestoreIdentifierKey: "com.omen.bluetooth"]
        )
    }

    func centralManager(
        _ central: CBCentralManager,
        willRestoreState dict: [String: Any]
    ) {
        if let peripherals = dict[CBCentralManagerRestoredStatePeripheralsKey] as? [CBPeripheral] {
            for peripheral in peripherals {
                connectedPeripheral = peripheral
                peripheral.delegate = self
            }
        }
    }
}
```

---

## Critical Rules

1. **Debounce Writes** - 100ms debounce to prevent ESP32 buffer overflow
2. **UTF-8 Encoding** - All text must be UTF-8 encoded
3. **[weak self]** - Always use in async callbacks
4. **Connection State** - Always check isConnected before writing
5. **Auto-Reconnect** - Implement reconnection logic for temporary disconnects
6. **Device Filtering** - Filter by device name "Omen_ESP32"
7. **MTU Awareness** - Don't exceed BLE MTU (typically 20 bytes)
8. **Error Handling** - Handle all BLE errors gracefully
9. **Background Support** - Configure for background BLE use
10. **State Restoration** - Restore connections after app restart

---

## ESP32 Configuration

### Arduino Code Example

```cpp
#include <BLEDevice.h>
#include <BLEUtils.h>
#include <BLEServer.h>
#include <BLE2902.h>

#define SERVICE_UUID        "6E400001-B5A3-F393-E0A9-E50E24DCCA9E"
#define TX_CHARACTERISTIC_UUID "6E400002-B5A3-F393-E0A9-E50E24DCCA9E"

BLECharacteristic *pTxCharacteristic;

class MyCallbacks: public BLECharacteristicCallbacks {
    void onWrite(BLECharacteristic *pCharacteristic) {
        std::string rxValue = pCharacteristic->getValue();

        if (rxValue.length() > 0) {
            // Display on OLED/LCD
            Serial.print("Received: ");
            for (int i = 0; i < rxValue.length(); i++)
                Serial.print(rxValue[i]);
            Serial.println();
        }
    }
};

void setup() {
    Serial.begin(115200);

    BLEDevice::init("Omen_ESP32");
    BLEServer *pServer = BLEDevice::createServer();
    BLEService *pService = pServer->createService(SERVICE_UUID);

    pTxCharacteristic = pService->createCharacteristic(
        TX_CHARACTERISTIC_UUID,
        BLECharacteristic::PROPERTY_WRITE |
        BLECharacteristic::PROPERTY_WRITE_NR
    );

    pTxCharacteristic->setCallbacks(new MyCallbacks());
    pService->start();

    BLEAdvertising *pAdvertising = BLEDevice::getAdvertising();
    pAdvertising->addServiceUUID(SERVICE_UUID);
    pAdvertising->start();

    Serial.println("BLE UART ready");
}
```

---

## Tools & Files

**Key Files:**
- `Omen/Services/BluetoothManager.swift` - Main BLE manager
- `Omen/Models/BLEConstants.swift` - UUID definitions
- `Omen/Utilities/Debouncer.swift` - Debouncing utility

**Xcode Tools:**
- **Console** - Monitor BLE connection logs
- **Instruments** - Profile BLE activity

---

**Status:** ✅ Production Ready
**Last Updated:** 2026-01-15
