import BayitCore
import BayitDesignSystem
import SwiftUI

/// Extension to PlayerView adding split screen subtitle support.
/// Provides the toggle button, cue loading logic, and language picker wiring.
extension PlayerView {
    // MARK: - Split Subtitle Toggle Button

    var splitSubtitleToggle: some View {
        Button {
            if splitModeEnabled {
                splitModeEnabled = false
                splitLanguages = []
                primarySubtitleCues = []
                secondarySubtitleCues = []
            } else {
                showSplitLanguagePicker = true
            }
        } label: {
            Image(systemName: splitModeEnabled ? "square.split.2x1.fill" : "square.split.2x1")
                .font(.system(size: 18))
                .foregroundStyle(
                    splitModeEnabled ? DesignTokens.Primary.p400 : .white
                )
                .frame(width: 44, height: 44)
        }
        .accessibilityLabel("Split screen subtitles")
        .accessibilityValue(splitModeEnabled ? "On" : "Off")
    }

    // MARK: - Load Split Subtitle Cues

    func loadSplitSubtitleCues() async {
        guard splitLanguages.count == 2 else { return }
        // Live channels use WebSocket-based subtitles, not REST cue fetching
        guard !mediaContentType.isLive else { return }

        async let primary = loadCuesForLanguage(splitLanguages[0])
        async let secondary = loadCuesForLanguage(splitLanguages[1])

        let (primaryResult, secondaryResult) = await (primary, secondary)
        primarySubtitleCues = primaryResult
        secondarySubtitleCues = secondaryResult
    }

    private func loadCuesForLanguage(_ language: String) async -> [SubtitleCue] {
        do {
            let response = try await repositories.subtitle.fetchCues(
                contentId: contentId,
                language: language,
                hebrewMode: SubtitleHebrewMode.standard,
                englishMode: SubtitleEnglishMode.standard
            )
            return response.cues ?? []
        } catch {
            BayitLogger(category: "Player").error(
                "Failed to load subtitle cues",
                error: error,
                context: ["language": language]
            )
            return []
        }
    }
}
