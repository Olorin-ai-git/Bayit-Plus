import Foundation

// MARK: - State Sync

extension FamilyControlsViewModel {
    func syncLocalState(from prefs: FamilyControlsPreferences) {
        if let kids = prefs.kidsAgeLimit {
            kidsMaxAge = Double(kids)
        }
        if let youngsters = prefs.youngstersAgeLimit {
            youngstersMaxAge = Double(youngsters)
        }
        if let ratingStr = prefs.maxContentRating,
           let rating = ContentRating(rawValue: ratingStr)
        {
            selectedRating = rating
        }
        if let enabled = prefs.viewingHoursEnabled {
            viewingHoursEnabled = enabled
        }
        if let start = prefs.viewingStartHour {
            var components = DateComponents()
            components.hour = start
            components.minute = 0
            if let date = Calendar.current.date(from: components) {
                allowedHoursStart = date
            }
        }
        if let end = prefs.viewingEndHour {
            var components = DateComponents()
            components.hour = end
            components.minute = 0
            if let date = Calendar.current.date(from: components) {
                allowedHoursEnd = date
            }
        }
    }
}
