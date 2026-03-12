#if os(iOS)
    import BayitCore
    import BayitDesignSystem
    import SwiftUI

    /// AI features panel, mutual exclusivity (dubbing vs subtitles), and language propagation.
    extension PlayerView {
        // MARK: - AI Features Panel View

        var glassAIFeaturesPanel: some View {
            GlassAIFeaturesPanel(
                isExpanded: showAIPanel,
                onToggleExpand: {
                    withAnimation(.spring(duration: 0.3)) {
                        showAIPanel.toggle()
                    }
                },
                currentLanguageCode: selectedAILanguage,
                splitLanguages: splitLanguages,
                isLiveContent: mediaContentType.isLive,
                isSplitLanguagesReady: selectedSecondaryLanguage != nil,
                onLanguageBadgeTap: { showAILanguagePicker = true },
                isSubtitlesEnabled: selectedSubtitleLanguage != nil,
                isSubtitlesConnecting: liveSubtitlesVM?.isConnecting ?? false,
                isSubtitlesPremiumLocked: liveSubtitlesVM?.isPremiumRequired ?? false,
                isSplitEnabled: splitModeEnabled,
                isDubbingEnabled: liveDubbingVM?.isEnabled ?? false,
                isDubbingConnecting: liveDubbingVM?.isConnecting ?? false,
                isDubbingPremiumLocked: liveDubbingVM?.isPremiumRequired ?? false,
                isTriviaEnabled: triviaVM?.isEnabled ?? false,
                isTriviaConnecting: isTriviaConnecting,
                isCatchUpAvailable: catchUpVM?.isAvailable == true,
                isCatchUpActive: showCatchUp,
                isSceneSearchActive: showSceneSearch,
                onSubtitlesTap: { toggleLiveTranslation() },
                onSplitSubtitlesTap: { toggleSplitSubtitles() },
                onDubbingTap: { toggleLiveDubbing() },
                onTriviaTap: { toggleLiveTrivia() },
                onCatchUpTap: { toggleCatchUp() },
                onSceneSearchTap: { toggleSceneSearch() },
                isVODMode: !mediaContentType.isLive,
                isYouTubeSource: mediaContentType.isYouTubeSource,
                isPauseAskActive: showPauseAskOverlay,
                isVODSubtitlesActive: subtitlesVM != nil,
                isVODVocabularyActive: subtitlesVM?.showTranslation ?? false,
                isVODMomentsActive: interactionVM != nil,
                isVODCulturalContextActive: culturalContextVM != nil,
                isVODBilingualBridgeActive: splitModeEnabled,
                isVODAICompanionActive: showAICompanion,
                onPauseAskTap: { handleVODFeatureTap(.pauseAsk) },
                onVODSubtitlesTap: { handleVODFeatureTap(.interactiveSubtitles) },
                onVODVocabularyTap: { handleVODFeatureTap(.vocabulary) },
                onVODMomentsTap: { handleVODFeatureTap(.vodMoments) },
                onVODCulturalContextTap: { handleVODFeatureTap(.culturalContext) },
                onVODBilingualBridgeTap: { handleVODFeatureTap(.bilingualBridge) },
                onVODAICompanionTap: { handleVODFeatureTap(.aiCompanion) }
            )
        }

        // MARK: - Trivia Connecting State

        private var isTriviaConnecting: Bool {
            guard let vm = triviaVM else { return false }
            return vm.isEnabled && !vm.isConnected
        }

        // MARK: - Toggle Live Translation

        /// Toggles live subtitles using `selectedAILanguage`. If dubbing is active,
        /// disables dubbing first (mutual exclusivity).
        func toggleLiveTranslation() {
            if selectedSubtitleLanguage != nil {
                handleSubtitleSelection(nil)
                // Auto-stop trivia when translation is disabled
                if triviaVM?.isEnabled == true {
                    triviaVM?.disconnectLiveTrivia()
                }
            } else {
                // Disable dubbing when enabling subtitles (mutual exclusivity)
                if liveDubbingVM?.isEnabled == true {
                    liveDubbingVM?.toggleDubbing(channelId: contentId)
                }
                handleSubtitleSelection(selectedAILanguage)
                // Auto-start trivia when translation is enabled
                let triviaLogger = BayitLogger(category: "LiveTrivia")
                triviaLogger.info("Auto-start check", context: [
                    "triviaVM": triviaVM == nil ? "nil" : "exists",
                    "isEnabled": String(triviaVM?.isEnabled ?? false),
                    "isLive": String(mediaContentType.isLive),
                    "channelId": contentId,
                ])
                if let vm = triviaVM, !vm.isEnabled, mediaContentType.isLive {
                    triviaLogger.info("Auto-starting trivia for channel", context: [
                        "channelId": contentId,
                        "language": selectedAILanguage,
                    ])
                    let triviaWS = LiveTriviaWebSocketService(
                        webSocketManager: repositories.webSocketManager,
                        configuration: repositories.configuration,
                        authTokenProvider: repositories.authTokenProvider
                    )
                    vm.toggleTrivia(
                        channelId: contentId,
                        language: selectedAILanguage,
                        webSocketService: triviaWS
                    )
                }
            }
        }

        // MARK: - Toggle Live Dubbing

        /// Toggles live dubbing using `selectedAILanguage`. If subtitles are active,
        /// disables them first (mutual exclusivity).
        func toggleLiveDubbing() {
            guard let vm = liveDubbingVM else { return }

            if !vm.isEnabled {
                // Disable active subtitles/split when enabling dubbing (mutual exclusivity)
                if selectedSubtitleLanguage != nil {
                    handleSubtitleSelection(nil)
                }
                if liveSubtitlesVM?.isEnabled == true {
                    liveSubtitlesVM?.toggleSubtitles(channelId: contentId)
                    selectedSubtitleLanguage = nil
                }
                if splitModeEnabled {
                    splitModeEnabled = false
                    splitLanguages = []
                    primarySubtitleCues = []
                    secondarySubtitleCues = []
                }
                // Ensure dubbing uses the unified AI language
                vm.selectLanguage(selectedAILanguage, channelId: contentId)
            }

            vm.toggleDubbing(channelId: contentId)
        }

        // MARK: - Toggle Split Subtitles

        /// Toggles split subtitle mode. For live content acts as a toggle when two
        /// languages are selected. For VOD content opens the existing sheet picker.
        func toggleSplitSubtitles() {
            if splitModeEnabled {
                splitModeEnabled = false
                splitLanguages = []
                primarySubtitleCues = []
                secondarySubtitleCues = []
                return
            }

            if mediaContentType.isLive {
                guard let secondary = selectedSecondaryLanguage else { return }
                let sourceLang = liveSubtitlesVM?.sourceLang ?? "he"

                // For live split, the WebSocket target must differ from the source.
                // Determine the non-source language to use as translation target.
                let targetLang: String
                if selectedAILanguage != sourceLang {
                    targetLang = selectedAILanguage
                } else {
                    targetLang = secondary
                }

                // Auto-enable live translate if not active
                if selectedSubtitleLanguage == nil {
                    if liveDubbingVM?.isEnabled == true {
                        liveDubbingVM?.toggleDubbing(channelId: contentId)
                    }
                    handleSubtitleSelection(targetLang)
                } else if liveSubtitlesVM?.selectedLanguage != targetLang {
                    liveSubtitlesVM?.selectLanguage(targetLang, channelId: contentId)
                }

                selectedAILanguage = targetLang
                splitLanguages = [selectedAILanguage, secondary]
                splitModeEnabled = true
                Task { await loadSplitSubtitleCues() }
            } else {
                showSplitLanguagePicker = true
            }
        }

        // MARK: - Toggle Live Trivia

        /// Toggles live trivia using `selectedAILanguage`.
        /// Auto-enables live translation if not already active, since trivia
        /// consumes transcripts from the translation pipeline.
        func toggleLiveTrivia() {
            guard let vm = triviaVM else { return }

            if vm.isEnabled {
                vm.disconnectLiveTrivia()
            } else {
                // Trivia requires live translation to produce transcripts.
                // Auto-enable subtitles/translation if not already active.
                if liveSubtitlesVM?.isEnabled != true {
                    if liveDubbingVM?.isEnabled == true {
                        liveDubbingVM?.toggleDubbing(channelId: contentId)
                    }
                    handleSubtitleSelection(selectedAILanguage)
                }

                let triviaWS = LiveTriviaWebSocketService(
                    webSocketManager: repositories.webSocketManager,
                    configuration: repositories.configuration,
                    authTokenProvider: repositories.authTokenProvider
                )
                vm.toggleTrivia(
                    channelId: contentId,
                    language: selectedAILanguage,
                    webSocketService: triviaWS
                )
            }
        }

        // MARK: - Toggle Catch Up

        func toggleCatchUp() {
            withAnimation(.spring(duration: 0.3)) {
                showCatchUp.toggle()
                showSceneSearch = false
                showChannelChat = false
            }
        }

        // MARK: - Toggle Scene Search

        func toggleSceneSearch() {
            withAnimation(.spring(duration: 0.3)) {
                showSceneSearch.toggle()
                showCatchUp = false
                showChannelChat = false
            }
        }

        // MARK: - AI Language Change

        /// Propagates a new AI language to all active features (subtitles, dubbing, trivia, split).
        func handleAILanguageChange(_ newLanguage: String) {
            selectedAILanguage = newLanguage

            if selectedSubtitleLanguage != nil {
                handleSubtitleSelection(newLanguage)
            }

            if liveSubtitlesVM?.isEnabled == true {
                liveSubtitlesVM?.selectLanguage(newLanguage, channelId: contentId)
            }

            if liveDubbingVM?.isEnabled == true {
                liveDubbingVM?.selectLanguage(newLanguage, channelId: contentId)
            }

            if let vm = triviaVM, vm.isEnabled {
                vm.disconnectLiveTrivia()
                let triviaWS = LiveTriviaWebSocketService(
                    webSocketManager: repositories.webSocketManager,
                    configuration: repositories.configuration,
                    authTokenProvider: repositories.authTokenProvider
                )
                vm.toggleTrivia(
                    channelId: contentId,
                    language: newLanguage,
                    webSocketService: triviaWS
                )
            }

            if splitModeEnabled, splitLanguages.count == 2 {
                splitLanguages[0] = newLanguage
                Task { await loadSplitSubtitleCues() }
            }
        }
    }
#endif
