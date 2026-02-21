#if os(iOS)
    import BayitCore
    import Foundation
    import GoogleCast
    import UIKit

    // MARK: - GCK Framework Calls

    extension CastSessionManager {
        func setupCastFramework(receiverAppId: String) async throws {
            let criteria = GCKDiscoveryCriteria(applicationID: receiverAppId)
            let options = GCKCastOptions(discoveryCriteria: criteria)
            options.physicalVolumeButtonsWillControlDeviceVolume = true
            GCKCastContext.setSharedInstanceWith(options)
            GCKCastContext.sharedInstance().useDefaultExpandedMediaControls = false

            let sd = CastSessionDelegate(manager: self)
            GCKCastContext.sharedInstance().sessionManager.add(sd)
            sessionDelegate = sd

            let dd = CastDiscoveryDelegate(manager: self)
            GCKCastContext.sharedInstance().discoveryManager.add(dd)
            discoveryDelegate = dd

            GCKCastContext.sharedInstance().discoveryManager.startDiscovery()
        }

        func showDevicePicker() async throws {
            guard UIApplication.shared.connectedScenes
                .compactMap({ ($0 as? UIWindowScene)?.windows.first?.rootViewController })
                .first != nil
            else {
                throw CastError.failedToConnect(
                    NSError(domain: "BayitCast", code: -1,
                            userInfo: [NSLocalizedDescriptionKey: "No root view controller available"])
                )
            }
            // GCKUIDeviceChooserController was removed in Cast SDK 4.8.
            // The recommended replacement is presentCastDialog(), available since 4.8.
            GCKCastContext.sharedInstance().presentCastDialog()
        }

        func sendMediaLoad(_ media: CastMedia) async throws {
            guard let remoteClient = GCKCastContext.sharedInstance()
                .sessionManager.currentCastSession?.remoteMediaClient
            else {
                throw CastError.notConnected
            }
            let mediaInfo = GCKMediaInformationBuilder.build(from: media)
            // GCKMediaLoadRequestData properties are read-only since Cast SDK 4.6.
            // Use GCKMediaLoadRequestDataBuilder to construct the request.
            let requestBuilder = GCKMediaLoadRequestDataBuilder()
            requestBuilder.mediaInformation = mediaInfo
            requestBuilder.autoplay = NSNumber(value: true)
            requestBuilder.startTime = 0
            let requestData = requestBuilder.build()
            try await withGCKRequest { remoteClient.loadMedia(with: requestData) }
        }

        func sendPlaybackSync(_ playbackState: CastPlaybackState) async throws {
            guard let remoteClient = GCKCastContext.sharedInstance()
                .sessionManager.currentCastSession?.remoteMediaClient
            else {
                return
            }
            if playbackState.isPlaying {
                try await withGCKRequest { remoteClient.play() }
            } else {
                try await withGCKRequest { remoteClient.pause() }
            }
            let castPosition = remoteClient.approximateStreamPosition()
            if abs(castPosition - playbackState.currentTime) > 2.0 {
                try await withGCKRequest {
                    remoteClient.seek(toTimeInterval: playbackState.currentTime)
                }
            }
            try await withGCKRequest {
                remoteClient.setStreamVolume(playbackState.volume)
            }
        }

        func terminateCastSession() async throws {
            GCKCastContext.sharedInstance().sessionManager.endSessionAndStopCasting(true)
            handleSessionEnded()
        }

        // MARK: - Async/await bridge for GCKRequest

        func withGCKRequest(_ block: () -> GCKRequest?) async throws {
            try await withCheckedThrowingContinuation { [weak self] continuation in
                guard let request = block() else {
                    continuation.resume()
                    return
                }
                let handler = GCKRequestHandler(continuation: continuation)
                request.delegate = handler
                self?.retainHandler(handler, for: request)
            }
        }

        private func retainHandler(_ handler: GCKRequestHandler, for request: GCKRequest) {
            // Associate handler lifetime with request lifetime so it is not deallocated
            // before the delegate callback fires. GCKRequest.delegate is weak.
            objc_setAssociatedObject(
                request,
                &GCKRequestHandler.associationKey,
                handler,
                .OBJC_ASSOCIATION_RETAIN_NONATOMIC
            )
        }
    }

    // MARK: - GCKRequestDelegate bridge

    final class GCKRequestHandler: NSObject, GCKRequestDelegate {
        static var associationKey: UInt8 = 0

        private let continuation: CheckedContinuation<Void, Error>

        init(continuation: CheckedContinuation<Void, Error>) {
            self.continuation = continuation
        }

        func requestDidComplete(_: GCKRequest) {
            continuation.resume()
        }

        func request(_: GCKRequest, didFailWithError error: GCKError) {
            continuation.resume(throwing: error)
        }

        func request(_: GCKRequest, didAbortWith abortReason: GCKRequestAbortReason) {
            let err = NSError(
                domain: "GCKRequest",
                code: Int(abortReason.rawValue),
                userInfo: [NSLocalizedDescriptionKey: "Request aborted (reason \(abortReason.rawValue))"]
            )
            continuation.resume(throwing: err)
        }
    }
#else
    import Foundation

    // MARK: - tvOS stubs (casting is not supported on tvOS)

    extension CastSessionManager {
        func setupCastFramework(receiverAppId _: String) async throws {
            throw CastError.initializationFailed(
                NSError(domain: "BayitCast", code: -1,
                        userInfo: [NSLocalizedDescriptionKey: "Casting is not supported on this platform"])
            )
        }

        func showDevicePicker() async throws {
            throw CastError.noDevicesAvailable
        }

        func sendMediaLoad(_: CastMedia) async throws {
            throw CastError.notConnected
        }

        func sendPlaybackSync(_: CastPlaybackState) async throws {}

        func terminateCastSession() async throws {}
    }
#endif
