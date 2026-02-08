import BayitCore
import Foundation
import Network
import Observation

/// Monitors network connectivity using NWPathMonitor.
/// Publishes connection state for use in SwiftUI via @Observable.
@Observable
@MainActor
final class NetworkMonitor {

    enum ConnectionType: String, Sendable {
        case wifi
        case cellular
        case wiredEthernet
        case other
        case none
    }

    private(set) var isConnected: Bool = true
    private(set) var connectionType: ConnectionType = .other

    private let monitor: NWPathMonitor
    private let monitorQueue = DispatchQueue(label: "tv.bayit.plus.networkmonitor")
    private let logger = BayitLogger(category: "NetworkMonitor")

    init() {
        self.monitor = NWPathMonitor()
        startMonitoring()
    }

    deinit {
        monitor.cancel()
    }

    // MARK: - Private

    private func startMonitoring() {
        monitor.pathUpdateHandler = { [weak self] path in
            Task { @MainActor [weak self] in
                guard let self else { return }
                let wasConnected = self.isConnected
                self.isConnected = path.status == .satisfied
                self.connectionType = Self.resolveConnectionType(path)

                if wasConnected != self.isConnected {
                    self.logger.info("Connectivity changed", context: [
                        "isConnected": "\(self.isConnected)",
                        "type": self.connectionType.rawValue
                    ])
                }
            }
        }
        monitor.start(queue: monitorQueue)
    }

    private static func resolveConnectionType(_ path: NWPath) -> ConnectionType {
        if path.usesInterfaceType(.wifi) { return .wifi }
        if path.usesInterfaceType(.cellular) { return .cellular }
        if path.usesInterfaceType(.wiredEthernet) { return .wiredEthernet }
        if path.status == .satisfied { return .other }
        return .none
    }
}
