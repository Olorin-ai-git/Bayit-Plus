#if os(iOS)
    import BayitCore
    import BayitDesignSystem
    import BayitLocalization
    import BayitNetworking
    import SwiftUI

    /// Extension on PlayerView providing channel chat overlay and
    /// live feature toolbar buttons.
    extension PlayerView {
        // MARK: - Channel Chat Overlay

        @ViewBuilder
        var channelChatOverlayView: some View {
            if showChannelChat, mediaContentType.isLive {
                HStack {
                    Spacer()
                    VStack(spacing: DesignTokens.Spacing.md) {
                        Text(localization.t("channelChat.title"))
                            .font(.system(
                                size: DesignTokens.FontSize.lg, weight: .semibold
                            ))
                            .foregroundStyle(DesignTokens.Text.primary)
                        Text(localization.t("channelChat.chatRequiresConnection"))
                            .font(.system(size: DesignTokens.FontSize.sm))
                            .foregroundStyle(DesignTokens.Text.muted)
                        GlassButton(localization.t("common.close"), variant: .secondary, size: .small) {
                            withAnimation(.spring(duration: 0.3)) {
                                showChannelChat = false
                            }
                        }
                    }
                    .padding(DesignTokens.Spacing.lg)
                    .glassCard()
                    .frame(maxWidth: 320)
                }
                .transition(.move(edge: .trailing).combined(with: .opacity))
            }
        }

        // MARK: - Live Features Toolbar Buttons

        @ViewBuilder
        var liveFeatureToolbarButtons: some View {
            if mediaContentType.isLive {
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
                .accessibilityLabel(localization.t("player.channelChat"))
            }
        }
    }
#endif
