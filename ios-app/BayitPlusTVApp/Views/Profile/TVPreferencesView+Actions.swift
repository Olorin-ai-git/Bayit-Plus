import BayitCore
import BayitDesignSystem
import SwiftUI

// MARK: - Track Changes & Save

extension TVPreferencesView {
    func trackChanges() {
        hasChanges = selectedLanguage != (preferences?.language ?? "en")
            || selectedSubtitleLanguage != (preferences?.subtitleLanguage ?? "he")
            || autoplay != (preferences?.autoplay ?? true)
            || notifications != (preferences?.notifications ?? true)
            || contentRating != (preferences?.contentRating ?? "pg13")
            || quality != (preferences?.quality ?? "auto")
    }

    func save() async {
        isSaving = true

        let update = ProfilePreferencesUpdate(
            language: selectedLanguage,
            subtitleLanguage: selectedSubtitleLanguage,
            autoplay: autoplay,
            notifications: notifications,
            contentRating: contentRating,
            quality: quality
        )

        await viewModel.updatePreferences(update)
        isSaving = false

        if viewModel.error == nil {
            hasChanges = false
            onDismiss()
        }
    }
}
