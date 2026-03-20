import Foundation
import Network

/// Determines device capability tier for adaptive cinematic features.
/// Full tier: video hero backgrounds. Lite tier: static images only.
@MainActor
final class DeviceCapability {
    static let shared = DeviceCapability()

    enum MemoryTier {
        case full // 6GB+ RAM — video backgrounds
        case lite // <6GB — static images only
    }

    private let monitor = NWPathMonitor()
    private let monitorQueue = DispatchQueue(
        label: "tv.bayit.plus.network-monitor"
    )
    private(set) var currentPath: NWPath?

    private init() {
        monitor.pathUpdateHandler = { [weak self] path in
            Task { @MainActor in
                self?.currentPath = path
            }
        }
        monitor.start(queue: monitorQueue)
    }

    static var memoryTier: MemoryTier {
        let physicalMemory = ProcessInfo.processInfo.physicalMemory
        let sixGB: UInt64 = 6 * 1024 * 1024 * 1024
        return physicalMemory >= sixGB ? .full : .lite
    }

    var isOnWifi: Bool {
        guard let path = currentPath else { return false }
        return path.usesInterfaceType(.wifi)
            || path.usesInterfaceType(.wiredEthernet)
    }

    var videoHeroSupported: Bool {
        Self.memoryTier == .full && isOnWifi
    }

    deinit {
        monitor.cancel()
    }
}
