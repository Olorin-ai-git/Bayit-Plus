#if os(iOS)
    import BayitDesignSystem
    import SwiftUI

    /// Extension on PlayerView providing live toolbar buttons,
    /// stream limit overlay, and device disconnect.
    extension PlayerView {
        // MARK: - Stream Limit Exceeded Overlay

        @ViewBuilder
        var streamLimitOverlay: some View {
            if showStreamLimitExceeded {
                ZStack {
                    Color.black.opacity(0.6).ignoresSafeArea()
                        .onTapGesture { showStreamLimitExceeded = false }

                    StreamLimitExceededView(
                        maxStreams: streamLimitMaxStreams,
                        activeDevices: streamLimitDevices,
                        onDisconnect: { deviceId in
                            Task { await disconnectDevice(deviceId) }
                        },
                        onDismiss: { showStreamLimitExceeded = false }
                    )
                }
                .transition(.opacity)
            }
        }

        // MARK: - Live Features Toolbar Buttons

        @ViewBuilder
        var liveFeatureButtons: some View {
            if mediaContentType.isLive {
                Button {
                    withAnimation(.spring(duration: 0.3)) {
                        showChannelChat.toggle()
                        showCatchUp = false
                        showSceneSearch = false
                    }
                } label: {
                    Image(systemName: "bubble.left.and.bubble.right")
                        .font(.system(size: 18))
                        .foregroundStyle(
                            showChannelChat
                                ? DesignTokens.Primary.p400 : .white
                        )
                        .frame(width: 44, height: 44)
                }
                .accessibilityLabel("Channel chat")
            }
        }

        // MARK: - Disconnect Device

        func disconnectDevice(_: String) async {
            showStreamLimitExceeded = false
        }
    }
#endif
