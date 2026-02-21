#if os(iOS)
    import Foundation
    import GoogleCast

    /// Bridges GCKSessionManagerListener events to CastSessionManager.
    ///
    /// Stored strongly on CastSessionManager because GCKSessionManager.add(_:)
    /// holds only a weak reference to its listeners.
    final class CastSessionDelegate: NSObject, GCKSessionManagerListener {
        private weak var manager: CastSessionManager?

        init(manager: CastSessionManager) {
            self.manager = manager
        }

        func sessionManager(
            _: GCKSessionManager,
            didStart session: GCKCastSession
        ) {
            let name = session.device.friendlyName ?? "Chromecast"
            let model = session.device.modelName ?? "Chromecast"
            let id = session.device.deviceID
            Task { @MainActor [weak manager] in
                manager?.handleSessionStarted(deviceName: name, modelName: model, deviceId: id)
            }
        }

        func sessionManager(
            _: GCKSessionManager,
            didResumeCastSession session: GCKCastSession
        ) {
            let name = session.device.friendlyName ?? "Chromecast"
            let model = session.device.modelName ?? "Chromecast"
            let id = session.device.deviceID
            Task { @MainActor [weak manager] in
                manager?.handleSessionStarted(deviceName: name, modelName: model, deviceId: id)
            }
        }

        func sessionManager(
            _: GCKSessionManager,
            didEnd _: GCKCastSession,
            withError _: Error?
        ) {
            Task { @MainActor [weak manager] in
                manager?.handleSessionEnded()
            }
        }

        func sessionManager(
            _: GCKSessionManager,
            didSuspend _: GCKCastSession,
            with _: GCKConnectionSuspendReason
        ) {
            Task { @MainActor [weak manager] in
                manager?.handleSessionEnded()
            }
        }

        func sessionManager(
            _: GCKSessionManager,
            didFailToStart _: GCKCastSession,
            withError error: Error
        ) {
            Task { @MainActor [weak manager] in
                manager?.handleSessionFailed(error: error)
            }
        }
    }

    /// Bridges GCKDiscoveryManagerListener events to CastSessionManager.
    ///
    /// Stored strongly on CastSessionManager for the same reason as CastSessionDelegate.
    final class CastDiscoveryDelegate: NSObject, GCKDiscoveryManagerListener {
        private weak var manager: CastSessionManager?

        init(manager: CastSessionManager) {
            self.manager = manager
        }

        func didUpdateDeviceList() {
            let hasDevices = GCKCastContext.sharedInstance().discoveryManager.deviceCount > 0
            Task { @MainActor [weak manager] in
                manager?.handleDeviceListChanged(hasDevices: hasDevices)
            }
        }
    }
#endif
