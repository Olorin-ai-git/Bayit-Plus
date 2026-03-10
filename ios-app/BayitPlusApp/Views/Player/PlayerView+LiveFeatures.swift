#if os(iOS)
    import BayitCore
    import BayitDesignSystem
    import BayitLocalization
    import BayitNetworking
    import SwiftUI

    /// Extension on PlayerView providing catch-up, scene search, channel chat,
    /// AI companion sidebar, and stream limit exceeded overlays.
    extension PlayerView {
        // MARK: - Catch-Up Auto-Prompt Overlay

        @ViewBuilder
        var catchUpAutoPromptOverlay: some View {
            if let vm = catchUpVM, vm.showAutoPrompt, mediaContentType.isLive {
                ZStack {
                    Color.black.opacity(0.4)
                        .ignoresSafeArea()
                        .onTapGesture {
                            vm.dismissAutoPrompt(channelId: contentId)
                        }

                    CatchUpAutoPromptView(
                        programName: viewModel.title,
                        creditCost: repositories.configuration.catchUpCreditCost,
                        creditBalance: vm.creditBalance,
                        autoDismissSeconds: repositories.configuration.catchUpAutoPromptSeconds,
                        onAccept: {
                            Task {
                                await vm.fetchSummary(
                                    channelId: contentId,
                                    windowMinutes: repositories.configuration.catchUpDefaultWindowMinutes,
                                    targetLanguage: selectedAILanguage
                                )
                            }
                        },
                        onDecline: {
                            vm.dismissAutoPrompt(channelId: contentId)
                        }
                    )
                }
                .transition(.opacity)
            }
        }

        // MARK: - Catch-Up Summary Overlay

        @ViewBuilder
        var catchUpSummaryOverlay: some View {
            if let vm = catchUpVM, vm.showSummary, let response = vm.summary {
                ZStack {
                    Color.black.opacity(0.4)
                        .ignoresSafeArea()
                        .onTapGesture { vm.closeSummary() }

                    CatchUpSummaryView(
                        response: response,
                        onClose: { vm.closeSummary() }
                    )
                    .padding(.horizontal, DesignTokens.Spacing.lg)
                }
                .transition(.opacity)
            }
        }

        // MARK: - Catch-Up Overlay (transcript timeline)

        @ViewBuilder
        var catchUpOverlay: some View {
            if showCatchUp, mediaContentType.isLive {
                if let vm = catchUpVM {
                    CatchUpView(
                        viewModel: vm,
                        channelId: contentId,
                        creditBalance: vm.creditBalance,
                        onSeek: { time in
                            showCatchUp = false
                            Task { await viewModel.player.seek(to: time) }
                        },
                        onDismiss: { showCatchUp = false },
                        onUpgrade: {
                            showCatchUp = false
                            coordinator.navigate(to: .subscription)
                        }
                    )
                    .transition(
                        .move(edge: .trailing).combined(with: .opacity)
                    )
                }
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
                    VStack(spacing: DesignTokens.Spacing.md) {
                        Text(localization.t("channelChat.title"))
                            .font(.system(
                                size: DesignTokens.FontSize.lg, weight: .semibold
                            ))
                            .foregroundStyle(DesignTokens.Text.primary)
                        Text(localization.t("channelChat.chatRequiresConnection"))
                            .font(.system(size: DesignTokens.FontSize.sm))
                            .foregroundStyle(DesignTokens.Text.muted)
                        GlassButton("Close", variant: .secondary, size: .small) {
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
    }
#endif
