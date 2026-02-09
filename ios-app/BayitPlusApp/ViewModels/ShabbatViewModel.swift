#if os(iOS)
import Foundation
import Observation
import UIKit

/// ViewModel for Shabbat-related screens (ZmanimView, ShabbatBannerView).
///
/// Coordinates between the `ShabbatRepository` for API calls and the
/// `ShabbatModeService` singleton for global Shabbat state.
///
/// Available on iOS only. Depends on ShabbatModeService and UIImpactFeedbackGenerator.
@Observable
final class ShabbatViewModel {
    private(set) var zmanimData: ZmanTimeResponse?
    private(set) var shabbatContent: [ContentItem] = []
    private(set) var isLoading = false
    private(set) var isLoadingContent = false
    private(set) var error: String?

    private let repository: any ShabbatRepository
    private let shabbatService: ShabbatModeService

    init(
        repository: any ShabbatRepository,
        shabbatService: ShabbatModeService = .shared
    ) {
        self.repository = repository
        self.shabbatService = shabbatService
    }

    // MARK: - Computed Properties

    /// Whether Shabbat mode is currently active (from the global service).
    var isShabbatActive: Bool {
        shabbatService.isShabbatActive
    }

    /// Whether auto-mode is enabled (from the global service).
    var autoModeEnabled: Bool {
        get { shabbatService.autoModeEnabled }
        set { shabbatService.autoModeEnabled = newValue }
    }

    /// Candle-lighting time from the service or local data.
    var candleLightingTime: String? {
        shabbatService.candleLightingTime ?? zmanimData?.candleLighting
    }

    /// Havdalah time from the service or local data.
    var havdalahTime: String? {
        shabbatService.havdalahTime ?? zmanimData?.havdalah
    }

    /// Hebrew parasha name.
    var parashaNameHebrew: String? {
        shabbatService.parashaNameHebrew ?? zmanimData?.parashaHebrew
    }

    /// English parasha name.
    var parashaNameEnglish: String? {
        shabbatService.parashaNameEnglish ?? zmanimData?.parashaEnglish
    }

    /// Countdown string (e.g. "2h 15m").
    var countdown: String? {
        shabbatService.countdown ?? zmanimData?.countdown
    }

    /// Label for the countdown direction.
    var countdownLabel: String? {
        shabbatService.countdownLabel ?? zmanimData?.countdownLabel
    }

    // MARK: - Actions

    @MainActor
    func loadZmanim() async {
        guard !isLoading else { return }
        isLoading = true
        error = nil

        let timezone = TimeZone.current.identifier

        do {
            let response = try await repository.fetchZmanTime(timezone: timezone)
            zmanimData = response
        } catch {
            self.error = error.localizedDescription
        }

        isLoading = false
    }

    @MainActor
    func loadShabbatContent() async {
        guard !isLoadingContent else { return }
        isLoadingContent = true

        do {
            let items = try await repository.fetchShabbatContent()
            shabbatContent = items
        } catch {
            self.error = error.localizedDescription
        }

        isLoadingContent = false
    }

    @MainActor
    func toggleShabbatMode() {
        shabbatService.toggleShabbatMode()
        UIImpactFeedbackGenerator(style: .medium).impactOccurred()
    }
}
#endif
