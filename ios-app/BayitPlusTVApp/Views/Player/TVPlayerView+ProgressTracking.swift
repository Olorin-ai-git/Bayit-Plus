import BayitCore
import BayitMedia
import SwiftUI

/// Progress tracking, subtitle preferences, chapter navigation,
/// and interactive moments initialization.
extension TVPlayerView {
    // MARK: - Interactive Moments Initialization

    func initializeInteractiveMoments() async {
        let logger = BayitLogger(category: "TVPlayerView")

        do {
            let prefsResponse = try await repos.settings.fetchPreferences()
            let enabled = prefsResponse.preferences?
                .interactiveMomentsEnabled ?? false
            guard enabled else {
                logger.info("Interactive moments disabled in preferences")
                return
            }
        } catch {
            logger.warning("Failed to fetch preferences: \(error)")
            return
        }

        do {
            let status = try await repos.avatarMeshRepository
                .fetchAvatarStatus(avatarId: "any")
            guard let imageUrl = status.avatarImageUrl,
                  status.status == "ready"
            else {
                logger.info("Avatar not ready: \(status.status)")
                await MainActor.run {
                    withAnimation { state.showNoAvatarWarning = true }
                }
                return
            }
            state.avatarImageUrl = imageUrl
            state.resolvedAvatarId = status.avatarId
            state.hasVoiceClone = status.hasVoiceClone
        } catch {
            logger.warning("Avatar fetch failed: \(error)")
            await MainActor.run {
                withAnimation { state.showNoAvatarWarning = true }
            }
            return
        }

        let vm = VODInteractionViewModel(
            repository: repos.avatarMeshRepository
        )
        await vm.loadMoments(contentId: contentId)
        guard !vm.moments.isEmpty else {
            logger.info("No interactive moments for content")
            return
        }
        state.interactionVM = vm
        state.voiceService = TVVoiceInteractionService(
            repository: repos.avatarMeshRepository
        )
        logger.info(
            "Interactive moments enabled: \(vm.moments.count) moments"
        )
    }

    // MARK: - Progress Tracking

    @MainActor
    func loadResumePosition() async {
        do {
            let history = try await repos.media.fetchContinueWatching()
            if let item = history.items.first(where: { $0.id == contentId }) {
                state.initialPosition = item.position ?? 0
            }
        } catch {
            // Resume position is optional
        }
    }

    @MainActor
    func startProgressTracking() {
        state.progressTrackingTask = Task {
            while !Task.isCancelled {
                try? await Task.sleep(for: .seconds(progressIntervalSeconds))
                guard !Task.isCancelled else { break }
                await saveProgress()
            }
        }
    }

    @MainActor
    func saveProgress() async {
        guard mediaPlayer.currentTime > 0, mediaPlayer.duration > 0 else { return }

        let request = WatchProgressRequest(
            contentId: contentId,
            contentType: contentType.rawValue,
            position: mediaPlayer.currentTime,
            duration: mediaPlayer.duration
        )

        do {
            _ = try await repos.media.updateProgress(request: request)
        } catch {
            // Progress save failures are non-critical
        }
    }

    // MARK: - Subtitle Preferences

    @MainActor
    func loadSubtitlePreference() async {
        do {
            let response = try await repos.subtitle.fetchPreferences(contentId: contentId)
            if let language = response.language, !language.isEmpty {
                handleSubtitleSelection(language)
            }
        } catch {
            // Subtitle preferences are optional
        }
    }

    @MainActor
    func saveSubtitlePreference(language: String) async {
        let update = SubtitlePreferencesUpdate(
            contentId: contentId,
            language: language
        )

        do {
            try await repos.subtitle.updatePreferences(update)
        } catch {
            // Preference save failures are non-critical
        }
    }

    // MARK: - Chapter Navigation

    @MainActor
    func loadChapters() async {
        do {
            state.chapters = try await repos.chapter.fetchChapters(contentId: contentId)
            state.hasChapters = !state.chapters.isEmpty
        } catch {
            state.chapters = []
            state.hasChapters = false
        }
    }

    func skipToPreviousChapter() {
        guard !state.chapters.isEmpty else { return }
        let currentTime = mediaPlayer.currentTime

        let previousChapter = state.chapters
            .filter { ($0.startTime ?? 0) < currentTime - 3 }
            .last

        if let chapter = previousChapter, let startTime = chapter.startTime {
            Task { await mediaPlayer.seek(to: startTime) }
        } else if let firstChapter = state.chapters.first,
                  let startTime = firstChapter.startTime
        {
            Task { await mediaPlayer.seek(to: startTime) }
        }
    }

    func skipToNextChapter() {
        guard !state.chapters.isEmpty else { return }
        let currentTime = mediaPlayer.currentTime

        let nextChapter = state.chapters
            .first { ($0.startTime ?? 0) > currentTime }

        if let chapter = nextChapter, let startTime = chapter.startTime {
            Task { await mediaPlayer.seek(to: startTime) }
        }
    }
}
