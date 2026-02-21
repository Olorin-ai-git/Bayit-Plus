import Foundation

// MARK: - Cue Handling

extension LiveSubtitlesViewModel {
    @MainActor
    func handleCue(_ cue: LiveSubtitleCueData) {
        if cue.isPartial == true {
            // Partial (pre-translation) cues only carry source-language text.
            // Update the original pane immediately; the translated pane waits
            // for the final subtitle so it never shows the wrong language.
            if let original = cue.originalText, !original.isEmpty {
                originalCueText = original
            }
        } else {
            activeCueText = cue.text ?? ""
            // Only update original if non-empty; translated text may produce
            // more chunks than the source, leaving trailing chunks with no
            // paired original text.
            if let original = cue.originalText, !original.isEmpty {
                originalCueText = original
            }
        }
        showOverlay = true

        cueDismissTask?.cancel()
        cueDismissTask = Task {
            try? await Task.sleep(for: cueDuration)
            if !Task.isCancelled {
                self.showOverlay = false
            }
        }
    }
}
