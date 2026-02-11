#if os(iOS)
import BayitDesignSystem
import SwiftUI

/// Extension on PlayerView providing catch-up, scene search, channel chat,
/// AI companion sidebar, and stream limit exceeded overlays.
extension PlayerView {

    // MARK: - Catch-Up Overlay

    @ViewBuilder
    var catchUpOverlay: some View {
        if showCatchUp, mediaContentType.isLive {
            CatchUpView(
                repository: repositories.liveTV,
                channelId: contentId,
                onSeek: { time in
                    showCatchUp = false
                    Task { await viewModel.player.seek(to: time) }
                },
                onDismiss: { showCatchUp = false }
            )
            .transition(.move(edge: .trailing).combined(with: .opacity))
        }
    }

    // MARK: - Scene Search Overlay

    @ViewBuilder
    var sceneSearchOverlay: some View {
        if showSceneSearch, mediaContentType.isLive {
            SceneSearchView(
                repository: repositories.liveTV,
                channelId: contentId,
                onSeek: { time in
                    showSceneSearch = false
                    Task { await viewModel.player.seek(to: time) }
                },
                onDismiss: { showSceneSearch = false }
            )
            .transition(.move(edge: .trailing).combined(with: .opacity))
        }
    }

    // MARK: - AI Companion Sidebar Overlay

    @ViewBuilder
    var aiCompanionOverlay: some View {
        if showAICompanion {
            HStack {
                Spacer()
                AICompanionSidebarView(
                    repository: repositories.chat,
                    contentId: contentId,
                    onDismiss: {
                        withAnimation(.spring(duration: 0.3)) {
                            showAICompanion = false
                        }
                    }
                )
            }
            .transition(.move(edge: .trailing).combined(with: .opacity))
        }
    }

    // MARK: - Channel Chat Overlay

    @ViewBuilder
    var channelChatOverlay: some View {
        if showChannelChat, mediaContentType.isLive {
            HStack {
                Spacer()
                ChannelChatView(
                    repository: repositories.liveTV,
                    webSocketManager: WebSocketManager(configuration: repositories.configuration),
                    channelId: contentId,
                    onDismiss: {
                        withAnimation(.spring(duration: 0.3)) {
                            showChannelChat = false
                        }
                    }
                )
                .frame(maxWidth: 320)
            }
            .transition(.move(edge: .trailing).combined(with: .opacity))
        }
    }

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
                    showCatchUp.toggle()
                    showSceneSearch = false
                    showChannelChat = false
                }
            } label: {
                Image(systemName: "clock.arrow.circlepath")
                    .font(.system(size: 18))
                    .foregroundStyle(showCatchUp ? DesignTokens.Primary.p400 : .white)
                    .frame(width: 44, height: 44)
            }
            .accessibilityLabel("Catch up")

            Button {
                withAnimation(.spring(duration: 0.3)) {
                    showSceneSearch.toggle()
                    showCatchUp = false
                    showChannelChat = false
                }
            } label: {
                Image(systemName: "magnifyingglass")
                    .font(.system(size: 18))
                    .foregroundStyle(showSceneSearch ? DesignTokens.Primary.p400 : .white)
                    .frame(width: 44, height: 44)
            }
            .accessibilityLabel("Scene search")

            Button {
                withAnimation(.spring(duration: 0.3)) {
                    showChannelChat.toggle()
                    showCatchUp = false
                    showSceneSearch = false
                }
            } label: {
                Image(systemName: "bubble.left.and.bubble.right")
                    .font(.system(size: 18))
                    .foregroundStyle(showChannelChat ? DesignTokens.Primary.p400 : .white)
                    .frame(width: 44, height: 44)
            }
            .accessibilityLabel("Channel chat")
        }
    }

    // MARK: - Disconnect Device

    func disconnectDevice(_ deviceId: String) async {
        // Endpoint to disconnect a specific streaming device
        // After disconnect, retry playback
        showStreamLimitExceeded = false
    }
}
#endif
