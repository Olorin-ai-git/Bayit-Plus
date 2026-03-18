import BayitAuth
import BayitCore
import BayitDesignSystem
import BayitMedia
import SwiftUI

/// Full-screen cover sheet content views presented from the player.
extension TVPlayerView {
    // MARK: - Subtitle Language Picker

    var subtitleLanguagePickerSheet: some View {
        TVSubtitleLanguagePickerView(
            availableLanguages: state.availableSubtitleLanguages,
            selectedLanguage: state.selectedSubtitleLanguage,
            isSplitEnabled: state.splitModeEnabled,
            onSelect: { handleSubtitleSelection($0) },
            onSplitTap: {
                state.showSubtitleLanguagePicker = false
                state.showSplitLanguagePicker = true
            },
            onDismiss: { state.showSubtitleLanguagePicker = false },
            contentId: contentId,
            repository: repos.subtitle,
            currentHebrewMode: state.subtitlesVM?.hebrewMode ?? .standard,
            currentEnglishMode: state.subtitlesVM?.englishMode ?? .standard,
            hasNikud: state.subtitlesVM?.hasNikud ?? false,
            hasShoresh: state.subtitlesVM?.hasShoresh ?? false,
            hasHeblish: state.subtitlesVM?.hasHeblish ?? false,
            hasEngrew: state.subtitlesVM?.hasEngrew ?? false,
            hasGrammarFlip: state.subtitlesVM?.hasGrammarFlip ?? false,
            hasSlangSynthesis: state.subtitlesVM?.hasSlangSynthesis ?? false,
            isAdmin: authManager.user?.role.isAdmin ?? false,
            onHebrewModeSelect: { mode in
                Task {
                    await state.subtitlesVM?.setHebrewMode(
                        mode, contentId: contentId,
                        language: state.selectedSubtitleLanguage
                    )
                }
            },
            onEnglishModeSelect: { mode in
                Task {
                    await state.subtitlesVM?.setEnglishMode(
                        mode, contentId: contentId,
                        language: state.selectedSubtitleLanguage
                    )
                }
            },
            onSubtitlesRefresh: {
                Task { await loadAvailableLanguages() }
            },
            creditCoordinator: creditCoordinator,
            creditBalance: creditsVM?.balance
        )
    }

    // MARK: - Split Language Picker

    var splitLanguagePickerSheet: some View {
        TVSplitLanguagePickerView(
            availableLanguages: state.availableSubtitleLanguages,
            selectedLanguages: state.splitLanguages,
            layout: $state.splitLayout,
            hasNikud: state.splitHasNikud,
            hasShoresh: state.splitHasShoresh,
            hasHeblish: state.splitHasHeblish,
            hasEngrew: state.splitHasEngrew,
            onConfirm: { items in
                guard items.count == 2 else { return }
                state.splitLanguages = items.map { $0.languageInfo.code }
                state.splitPrimaryHebrewMode = items[0].hebrewMode ?? .standard
                state.splitPrimaryEnglishMode = items[0].englishMode ?? .standard
                state.splitSecondaryHebrewMode = items[1].hebrewMode ?? .standard
                state.splitSecondaryEnglishMode = items[1].englishMode ?? .standard
                state.splitModeEnabled = true
                state.showSplitLanguagePicker = false
                Task { await loadSplitSubtitleCues() }
            },
            onDismiss: { state.showSplitLanguagePicker = false }
        )
    }

    // MARK: - AI Language Picker

    var aiLanguagePickerSheet: some View {
        TVAILanguagePickerView(
            selectedLanguage: state.selectedAILanguage,
            onSelect: { handleAILanguageChange($0) },
            onDismiss: { state.showAILanguagePicker = false }
        )
    }

    // MARK: - Dubbing Controls

    @ViewBuilder
    var dubbingControlsSheet: some View {
        if let vm = state.liveDubbingVM {
            TVLiveDubbingOverlayView(
                viewModel: vm,
                channelId: channelId ?? contentId
            )
        }
    }

    // MARK: - Chapter List

    var chapterListSheet: some View {
        TVChapterNavigationView(contentId: contentId) { chapter in
            state.showChapterList = false
            if let startTime = chapter.startTime {
                Task { await mediaPlayer.seek(to: startTime) }
            }
        }
    }

    // MARK: - Audio Tracks

    var audioTracksSheet: some View {
        TVAudioTrackSelectorView(
            tracks: state.audioTracks,
            selectedTrackId: $state.selectedAudioTrackId,
            onDismiss: { state.showAudioTracks = false }
        )
    }

    // MARK: - Speed Control

    var speedControlSheet: some View {
        TVPlaybackSpeedControlView(
            currentSpeed: state.playbackSpeed,
            onSpeedSelected: { speed in
                state.playbackSpeed = speed
                mediaPlayer.setRate(speed)
                state.showSpeedControl = false
            },
            onDismiss: { state.showSpeedControl = false }
        )
    }

    // MARK: - Catch-Up

    @ViewBuilder
    var catchUpSheet: some View {
        if let vm = state.catchUpVM {
            TVCatchUpView(
                viewModel: vm,
                channelId: channelId ?? contentId,
                targetLanguage: state.selectedAILanguage,
                onSeek: { time in
                    state.showCatchUp = false
                    Task { await mediaPlayer.seek(to: time) }
                },
                onDismiss: { state.showCatchUp = false }
            )
        }
    }

    // MARK: - Scene Search

    var sceneSearchSheet: some View {
        TVSceneSearchView(
            repository: repos.liveTV,
            channelId: channelId ?? contentId,
            localization: localization,
            onSeek: { time in
                state.showSceneSearch = false
                Task { await mediaPlayer.seek(to: time) }
            },
            onDismiss: { state.showSceneSearch = false }
        )
    }

    // MARK: - Character → Dialogue Flow (single fullScreenCover, avoids sequential-cover tvOS bug)

    @ViewBuilder
    var characterDialogueFlowSheet: some View {
        if let vm = state.dialogueVM,
           let imgUrl = state.avatarImageUrl
        {
            TVCharacterDialogueFlowView(
                characters: vm.availableCharacters,
                viewModel: vm,
                avatarImageUrl: imgUrl,
                avatarId: state.resolvedAvatarId,
                contentId: contentId,
                currentTimestamp: mediaPlayer.currentTime,
                voiceService: state.voiceService,
                avatarPlacement: state.interactionVM?.activeMoment?.avatarPlacement,
                onDismiss: {
                    state.showCharacterSelection = false
                    await state.dialogueVM?.endSession()
                    restoreVolume()
                    mediaPlayer.avPlayer.play()
                }
            )
        }
    }
}
