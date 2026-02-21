import BayitNetworking
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
    var viewingHoursEnabled: Bool = false
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
            let prefs = try await repository.fetchControls()
            preferences = prefs
            syncLocalState(from: prefs)
            isPinSet = true
        } catch let apiError as APIError {
            if case .notFound = apiError {
                isPinSet = false
            } else {
                self.error = apiError.localizedDescription
            }
        } catch {
            if let message = error.userFriendlyMessage {
                self.error = message
            }
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
            let request = FamilyControlsSetupRequest(
                pin: pin,
                kidsAgeLimit: Int(kidsMaxAge),
                youngstersAgeLimit: Int(youngstersMaxAge)
            )
            try await repository.setup(request)
            isPinSet = true
            isPinVerified = true
            #if os(iOS)
                UIImpactFeedbackGenerator(style: .light).impactOccurred()
            #endif
        } catch {
            if let message = error.userFriendlyMessage {
                self.error = message
            }
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
            if response.status == "success" {
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
            if let message = error.userFriendlyMessage {
                self.error = message
            }
        }

        isSaving = false
    }

    // MARK: - Save

    @MainActor
    func savePreferences() async {
        isSaving = true
        error = nil
        successMessage = nil

        let startHour = Calendar.current.component(.hour, from: allowedHoursStart)
        let endHour = Calendar.current.component(.hour, from: allowedHoursEnd)

        let update = FamilyControlsUpdateRequest(
            kidsAgeLimit: Int(kidsMaxAge),
            youngstersAgeLimit: Int(youngstersMaxAge),
            maxContentRating: selectedRating.rawValue,
            viewingHoursEnabled: viewingHoursEnabled,
            viewingStartHour: startHour,
            viewingEndHour: endHour
        )

        do {
            let saved = try await repository.updateControls(update)
            preferences = saved
            successMessage = "Settings saved"
            #if os(iOS)
                UIImpactFeedbackGenerator(style: .light).impactOccurred()
            #endif
        } catch {
            if let message = error.userFriendlyMessage {
                self.error = message
            }
        }

        isSaving = false
    }
}
