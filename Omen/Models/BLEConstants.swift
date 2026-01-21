import CoreBluetooth

/// BLE constants for Omen ESP32 wearable communication
struct BLEConstants {
    /// Name of the ESP32 peripheral to scan for
    static let peripheralName = "Omen_ESP32"

    /// Nordic UART Service UUID
    /// This is the main service UUID for UART communication
    static let serviceUUID = CBUUID(string: "6E400001-B5A3-F393-E0A9-E50E24DCCA9E")

    /// TX Characteristic UUID (Write to ESP32)
    /// Used to transmit text data to the ESP32 wearable
    static let txCharacteristicUUID = CBUUID(string: "6E400002-B5A3-F393-E0A9-E50E24DCCA9E")

    /// Maximum text length per BLE write (considering MTU limits)
    static let maxTextLength = 512

    /// Connection timeout in seconds
    static let connectionTimeout: TimeInterval = 10.0
}
