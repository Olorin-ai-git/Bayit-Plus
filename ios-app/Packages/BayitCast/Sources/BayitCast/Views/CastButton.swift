import BayitCore
import SwiftUI

/// Cast button that displays casting status and allows users to start/stop casting.
public struct CastButton: View {
    @ObservedObject private var sessionManager: CastSessionManager
    private let size: CGFloat
    private let activeColor: Color
    private let inactiveColor: Color

    private let logger = BayitLogger(category: "CastButton")

    public init(
        sessionManager: CastSessionManager,
        size: CGFloat = 24,
        activeColor: Color = .blue,
        inactiveColor: Color = .white
    ) {
        self.sessionManager = sessionManager
        self.size = size
        self.activeColor = activeColor
        self.inactiveColor = inactiveColor
    }

    public var body: some View {
        if sessionManager.state.isAvailable {
            Button(action: handleTap) {
                ZStack {
                    if sessionManager.state.isConnecting {
                        ProgressView()
                            .progressViewStyle(.circular)
                            .frame(width: size, height: size)
                    } else {
                        Image(systemName: iconName)
                            .font(.system(size: size))
                            .foregroundStyle(iconColor)
                    }
                }
                .frame(width: size + 16, height: size + 16)
                .contentShape(Rectangle())
            }
            .accessibilityLabel(accessibilityLabel)
            .accessibilityHint(accessibilityHint)
        }
    }

    private var iconName: String {
        switch sessionManager.state {
        case .connected:
            return "airplayvideo.circle.fill"
        case .connecting:
            return "airplayvideo.circle"
        default:
            return "airplayvideo"
        }
    }

    private var iconColor: Color {
        sessionManager.state.isConnected ? activeColor : inactiveColor
    }

    private var accessibilityLabel: String {
        if let deviceName = sessionManager.deviceInfo?.deviceName {
            return "Connected to \(deviceName)"
        }
        return sessionManager.state.isConnected ? "Connected to cast device" : "Cast"
    }

    private var accessibilityHint: String {
        sessionManager.state.isConnected
            ? "Double tap to stop casting"
            : "Double tap to select a cast device"
    }

    private func handleTap() {
        logger.info("Cast button tapped", context: [
            "currentState": sessionManager.state.rawValue
        ])

        Task {
            do {
                if sessionManager.state.isConnected {
                    try await sessionManager.endSession()
                } else {
                    try await sessionManager.presentDevicePicker()
                }
            } catch {
                logger.error("Cast button action failed", error: error, context: [
                    "action": sessionManager.state.isConnected ? "stop" : "start"
                ])
            }
        }
    }
}
