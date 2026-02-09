import BayitDesignSystem
import SwiftUI

/// Extension to PlayerView adding split screen subtitle support.
/// This file contains all the split subtitle state management and UI components.
extension PlayerView {

    // MARK: - Split Subtitle State (Add these to PlayerView's @State variables)

    /*
    Add these @State variables to PlayerView:

    @State private var splitModeEnabled = false
    @State private var splitLanguages: [String] = []
    @State private var showSplitLanguagePicker = false
    @State private var primarySubtitleCues: [SubtitleCue] = []
    @State private var secondarySubtitleCues: [SubtitleCue] = []
    */

    // MARK: - Split Subtitle Overlay (Add to body after InteractiveSubtitlesOverlay)

    /*
    Add this after the InteractiveSubtitlesOverlay in the body:

    // Split subtitle overlay (when split mode is enabled)
    if splitModeEnabled && splitLanguages.count == 2 {
        SplitSubtitleOverlayView(
            currentTime: viewModel.player.currentTime,
            primaryCues: primarySubtitleCues,
            secondaryCues: secondarySubtitleCues,
            primaryLanguage: splitLanguages[0],
            secondaryLanguage: splitLanguages[1],
            enabled: splitModeEnabled,
            settings: SubtitleSettings(),
            safeAreaBottom: UIApplication.shared.connectedScenes
                .compactMap { ($0 as? UIWindowScene)?.windows.first }
                .first?.safeAreaInsets.bottom ?? 0
        )
        .allowsHitTesting(showControls)
    }
    */

    // MARK: - Split Subtitle Toggle (Add to topBar after subtitleToggle)

    /*
    Add this after subtitleToggle in the topBar:

    splitSubtitleToggle
    */

    // MARK: - Split Language Picker Modal (Add to body with .sheet modifier)

    /*
    Add this after the existing .sheet modifiers:

    .sheet(isPresented: $showSplitLanguagePicker) {
        SplitSubtitleLanguagePickerView(
            availableLanguages: availableSubtitleLanguages,
            sourceLanguage: "he",
            selectedLanguages: $splitLanguages,
            splitModeEnabled: $splitModeEnabled,
            onConfirm: { languages in
                splitLanguages = languages
                splitModeEnabled = true
                Task {
                    await loadSplitSubtitleCues()
                }
            }
        )
        .presentationDetents([.large])
        .presentationDragIndicator(.visible)
    }
    */

    // MARK: - Split Subtitle Toggle Button

    var splitSubtitleToggle: some View {
        Button {
            if splitModeEnabled {
                // Disable split mode
                splitModeEnabled = false
                splitLanguages = []
                primarySubtitleCues = []
                secondarySubtitleCues = []
            } else {
                // Show language picker
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
            print("Failed to load \(language) cues: \(error)")
            return []
        }
    }
}
