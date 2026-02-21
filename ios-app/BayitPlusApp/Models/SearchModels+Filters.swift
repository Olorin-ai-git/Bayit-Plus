import Foundation

// MARK: - Search Advanced Filters

struct SearchAdvancedFilters: Sendable, Equatable {
    var language: String?
    var yearFrom: Int?
    var yearTo: Int?
    var durationMin: Int?
    var durationMax: Int?
    var hasSubtitles: Bool?
    var hasDubbing: Bool?

    var activeCount: Int {
        var count = 0
        if language != nil { count += 1 }
        if yearFrom != nil || yearTo != nil { count += 1 }
        if durationMin != nil || durationMax != nil { count += 1 }
        if hasSubtitles == true { count += 1 }
        if hasDubbing == true { count += 1 }
        return count
    }

    var isEmpty: Bool {
        activeCount == 0
    }

    mutating func reset() {
        language = nil
        yearFrom = nil
        yearTo = nil
        durationMin = nil
        durationMax = nil
        hasSubtitles = nil
        hasDubbing = nil
    }
}
