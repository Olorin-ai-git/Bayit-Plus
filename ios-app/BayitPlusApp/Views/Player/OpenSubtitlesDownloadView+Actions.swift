import BayitDesignSystem
import BayitLocalization
import SwiftUI

/// Extension providing the download action for OpenSubtitlesDownloadView.
extension OpenSubtitlesDownloadView {
    func downloadSubtitles() async {
        isLoading = true
        error = nil
        result = nil

        do {
            let response = try await repository.fetchExternalSubtitles(contentId: contentId)
            result = response
            if response.imported?.isEmpty == false {
                onSuccess()
            }
        } catch {
            // Parse user-friendly error messages
            let errorDescription = error.localizedDescription
            if errorDescription.contains("quota") || errorDescription.contains("100 subtitles") {
                self.error = localization.t("subtitles.quotaExceededLabel")
            } else if errorDescription.contains("429") || errorDescription.contains("Too Many Requests") {
                self.error = localization.t("subtitles.rateLimitExceeded")
            } else if errorDescription.contains("decode") || errorDescription.contains("format") {
                self.error = localization.t("subtitles.noAdditionalFound")
            } else if errorDescription.contains("404") || errorDescription.contains("Not Found") {
                self.error = localization.t("subtitles.noAdditionalFound")
            } else if errorDescription.contains("422") || errorDescription.contains("Validation") {
                self.error = localization.t("subtitles.noAdditionalFound")
            } else {
                self.error = errorDescription
            }
        }

        isLoading = false
    }
}
