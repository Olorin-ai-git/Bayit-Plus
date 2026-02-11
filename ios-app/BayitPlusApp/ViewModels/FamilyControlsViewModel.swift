import Foundation
import Observation
#if os(iOS)
import UIKit
#endif

/// ViewModel for the Family Controls screen.
///
/// Manages parental PIN verification, age sliders, content rating
/// selection, and allowed-hours configuration. The PIN gate prevents
/// unauthorized access to family control settings.
@MainActor
@Observable
final class FamilyControlsViewModel {
    private(set) var preferences: FamilyControlsPreferences?
    private(set) var isPinSet = false
    private(set) var isPinVerified = false
    private(set) var isLoading = false
    private(set) var isSaving = false
    private(set) var error: String?
    private(set) var successMessage: String?

    var kidsMaxAge: Double = 12
    var youngstersMaxAge: Double = 17
    var selectedRating: ContentRating = .pg13
    var allowedHoursStart: Date = {
        var components = DateComponents()
        components.hour = 8
        components.minute = 0
        return Calendar.current.date(from: components) ?? Date()
    }()
    var allowedHoursEnd: Date = {
        var components = DateComponents()
        components.hour = 20
        components.minute = 0
        return Calendar.current.date(from: components) ?? Date()
    }()

    private let repository: any FamilyControlsRepository

    init(repository: any FamilyControlsRepository) {
        self.repository = repository
    }

    // MARK: - Load

    @MainActor
    func loadPreferences() async {
        guard !isLoading else { return }
        isLoading = true
        error = nil

        do {
            let prefs = try await repository.fetchPreferences()
            preferences = prefs
            syncLocalState(from: prefs)
            isPinSet = prefs.pinHash != nil
        } catch {
            self.error = error.localizedDescription
        }

        isLoading = false
    }

    // MARK: - PIN

    @MainActor
    func setPin(_ pin: String) async {
        guard pin.count == 4 else {
            error = "PIN must be 4 digits"
            return
        }

        isSaving = true
        error = nil

        do {
            try await repository.setPin(FamilyPinRequest(pin: pin))
            isPinSet = true
            isPinVerified = true
            #if os(iOS)
            UIImpactFeedbackGenerator(style: .light).impactOccurred()
            #endif
        } catch {
            self.error = error.localizedDescription
        }

        isSaving = false
    }

    @MainActor
    func verifyPin(_ pin: String) async {
        guard pin.count == 4 else {
            error = "PIN must be 4 digits"
            return
        }

        isSaving = true
        error = nil

        do {
            let response = try await repository.verifyPin(
                FamilyPinRequest(pin: pin)
            )
            if response.valid == true {
                isPinVerified = true
                #if os(iOS)
            UIImpactFeedbackGenerator(style: .light).impactOccurred()
            #endif
            } else {
                error = "Invalid PIN"
                #if os(iOS)
                UIImpactFeedbackGenerator(style: .heavy).impactOccurred()
                #endif
            }
        } catch {
            self.error = error.localizedDescription
        }

        isSaving = false
    }

    // MARK: - Save

    @MainActor
    func savePreferences() async {
        isSaving = true
        error = nil
        successMessage = nil

        let formatter = DateFormatter()
        formatter.dateFormat = "HH:mm"

        let update = FamilyControlsPreferencesUpdate(
            kidsMaxAge: Int(kidsMaxAge),
            youngstersMaxAge: Int(youngstersMaxAge),
            maxRating: selectedRating.rawValue,
            allowedHoursStart: formatter.string(from: allowedHoursStart),
            allowedHoursEnd: formatter.string(from: allowedHoursEnd)
        )

        do {
            let saved = try await repository.updatePreferences(update)
            preferences = saved
            successMessage = "Settings saved"
            #if os(iOS)
            UIImpactFeedbackGenerator(style: .light).impactOccurred()
            #endif
        } catch {
            self.error = error.localizedDescription
        }

        isSaving = false
    }

    // MARK: - Private

    private func syncLocalState(from prefs: FamilyControlsPreferences) {
        if let kids = prefs.kidsMaxAge {
            kidsMaxAge = Double(kids)
        }
        if let youngsters = prefs.youngstersMaxAge {
            youngstersMaxAge = Double(youngsters)
        }
        if let ratingStr = prefs.maxRating,
           let rating = ContentRating(rawValue: ratingStr) {
            selectedRating = rating
        }

        let formatter = DateFormatter()
        formatter.dateFormat = "HH:mm"
        if let startStr = prefs.allowedHoursStart,
           let start = formatter.date(from: startStr) {
            allowedHoursStart = start
        }
        if let endStr = prefs.allowedHoursEnd,
           let end = formatter.date(from: endStr) {
            allowedHoursEnd = end
        }
    }
}
