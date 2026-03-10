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
                // Catch-up button: gated behind availability (beta user + server check)
                if catchUpVM?.isAvailable == true {
                    Button {
                        withAnimation(.spring(duration: 0.3)) {
                            showCatchUp.toggle()
                            showSceneSearch = false
                            showChannelChat = false
                        }
                    } label: {
                        Image(systemName: "clock.arrow.circlepath")
                            .font(.system(size: 18))
                            .foregroundStyle(
                                showCatchUp
                                    ? DesignTokens.Primary.p400 : .white
                            )
                            .frame(width: 44, height: 44)
                    }
                    .accessibilityLabel("Catch up")
                    .walkthroughTarget(id: "discover_catch_up_step2")
                    .walkthroughTarget(id: "discover_catch_up_step3")
                    .featureTooltip(
                        featureKey: "catchup",
                        titleKey: "tooltip.catchup.title",
                        descriptionKey: "tooltip.catchup.description",
                        arrowDirection: .top,
                        tooltipManager: resolvedTooltipManager
                    )
                }

                Button {
                    withAnimation(.spring(duration: 0.3)) {
                        showSceneSearch.toggle()
                        showCatchUp = false
                        showChannelChat = false
                    }
                } label: {
                    Image(systemName: "magnifyingglass")
                        .font(.system(size: 18))
                        .foregroundStyle(
                            showSceneSearch
                                ? DesignTokens.Primary.p400 : .white
                        )
                        .frame(width: 44, height: 44)
                }
                .accessibilityLabel("Scene search")
                .walkthroughTarget(id: "discover_scene_search_step2")
                .walkthroughTarget(id: "discover_scene_search_step3")

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
