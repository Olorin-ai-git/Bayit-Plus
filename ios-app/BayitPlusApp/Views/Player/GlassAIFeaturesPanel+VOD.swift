#if os(iOS)
    import BayitDesignSystem
    import BayitLocalization
    import SwiftUI

    // MARK: - VOD AI Feature Buttons

    extension GlassAIFeaturesPanel {
        var vodPauseAskButton: some View {
            GlassLiveControlButton(
                icon: "bubble.left.and.text.bubble.right",
                activeIcon: "bubble.left.and.text.bubble.right.fill",
                label: localization.t("byoc.ai.feature.pauseAsk.name"),
                state: isPauseAskActive ? .enabled : .idle,
                onTap: onPauseAskTap
            )
        }

        var vodSubtitlesButton: some View {
            GlassLiveControlButton(
                icon: "captions.bubble",
                activeIcon: "captions.bubble.fill",
                label: localization.t("byoc.ai.feature.interactiveSubtitles.name"),
                state: isVODSubtitlesActive ? .enabled : .idle,
                onTap: onVODSubtitlesTap
            )
        }

        var vodVocabularyButton: some View {
            GlassLiveControlButton(
                icon: "character.book.closed",
                activeIcon: "character.book.closed.fill",
                label: localization.t("byoc.ai.feature.vocabulary.name"),
                state: isVODVocabularyActive ? .enabled : .idle,
                onTap: onVODVocabularyTap
            )
        }

        var vodMomentsButton: some View {
            GlassLiveControlButton(
                icon: "sparkles.rectangle.stack",
                activeIcon: "sparkles.rectangle.stack.fill",
                label: localization.t("byoc.ai.feature.vodMoments.name"),
                state: isVODMomentsActive ? .enabled : .idle,
                onTap: onVODMomentsTap
            )
        }

        var vodCulturalContextButton: some View {
            GlassLiveControlButton(
                icon: "globe",
                activeIcon: "globe.badge.chevron.backward",
                label: localization.t("byoc.ai.feature.culturalContext.name"),
                state: isVODCulturalContextActive ? .enabled : .idle,
                onTap: onVODCulturalContextTap
            )
        }

        var vodBilingualBridgeButton: some View {
            GlassLiveControlButton(
                icon: "rectangle.split.2x1",
                activeIcon: "rectangle.split.2x1.fill",
                label: localization.t("byoc.ai.feature.bilingualBridge.name"),
                state: isVODBilingualBridgeActive ? .enabled : .idle,
                onTap: onVODBilingualBridgeTap
            )
        }

        var vodAICompanionButton: some View {
            GlassLiveControlButton(
                icon: "person.crop.circle.badge.questionmark",
                activeIcon: "person.crop.circle.badge.questionmark.fill",
                label: localization.t("byoc.ai.feature.aiCompanion.name"),
                state: isVODAICompanionActive ? .enabled : .idle,
                onTap: onVODAICompanionTap
            )
        }

        var vodButtonsContent: some View {
            Group {
                vodPauseAskButton
                vodSubtitlesButton
                vodVocabularyButton
                if !isYouTubeSource {
                    vodMomentsButton
                }
                vodCulturalContextButton
                vodBilingualBridgeButton
                vodAICompanionButton
            }
        }
    }
#endif
