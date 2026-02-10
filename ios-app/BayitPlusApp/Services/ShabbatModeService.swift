#if os(iOS)
import BayitWidgetShared
#endif
import Foundation
import Observation
#if os(iOS)
import WidgetKit
#endif

/// Singleton service that polls zmanim data and tracks Shabbat state.
///
/// Polls `/api/v1/zman/time` at a configurable interval to determine
/// whether Shabbat is currently active and to surface candle-lighting,
/// havdalah, parasha, and countdown information throughout the app.
@Observable
final class ShabbatModeService {

    // MARK: - Configuration

    private enum Configuration {
        /// Interval between zmanim API polls.
        static let pollingIntervalSeconds: TimeInterval = 300
    }

    // MARK: - Public State

    private(set) var isShabbatActive = false
    private(set) var shabbatData: ZmanTimeResponse?
    private(set) var error: String?

    /// Whether the user has opted in to automatic Shabbat mode activation.
    var autoModeEnabled: Bool {
        didSet {
            UserDefaults.standard.set(
                autoModeEnabled,
                forKey: userDefaultsAutoModeKey
            )
        }
    }

    // MARK: - Computed Properties

    /// The formatted candle-lighting time from the latest poll.
    var candleLightingTime: String? {
        shabbatData?.candleLighting
    }

    /// The formatted havdalah time from the latest poll.
    var havdalahTime: String? {
        shabbatData?.havdalah
    }

    /// The Hebrew name of the weekly Torah portion.
    var parashaNameHebrew: String? {
        shabbatData?.parashaHebrew
    }

    /// The English name of the weekly Torah portion.
    var parashaNameEnglish: String? {
        shabbatData?.parashaEnglish
    }

    /// A human-readable countdown string (e.g. "2h 15m").
    var countdown: String? {
        shabbatData?.countdown
    }

    /// A label for the countdown (e.g. "until Shabbat", "since Shabbat").
    var countdownLabel: String? {
        shabbatData?.countdownLabel
    }

    /// Whether it is Erev Shabbat (Friday before candle-lighting).
    var isErevShabbat: Bool {
        shabbatData?.isErevShabbat ?? false
    }

    // MARK: - Private

    private let userDefaultsAutoModeKey = "tv.bayit.shabbat.autoModeEnabled"
    private var pollingTask: Task<Void, Never>?
    private var repository: (any ShabbatRepository)?

    // MARK: - Singleton

    static let shared = ShabbatModeService()

    private init() {
        self.autoModeEnabled = UserDefaults.standard.bool(
            forKey: userDefaultsAutoModeKey
        )
    }

    // MARK: - Public API

    /// Starts polling zmanim data with the injected repository.
    ///
    /// Call this once during app startup, supplying the `ShabbatRepository`
    /// from the `RepositoryProvider`. Subsequent calls are no-ops if polling
    /// is already running.
    func startPolling(repository: any ShabbatRepository) {
        guard pollingTask == nil else { return }
        self.repository = repository
        pollingTask = Task { [weak self] in
            guard let self else { return }
            while !Task.isCancelled {
                await self.fetchZmanTime()
                try? await Task.sleep(
                    for: .seconds(Configuration.pollingIntervalSeconds)
                )
            }
        }
    }

    /// Stops the background polling loop.
    func stopPolling() {
        pollingTask?.cancel()
        pollingTask = nil
    }

    /// Performs a single immediate refresh of zmanim data.
    @MainActor
    func refresh() async {
        await fetchZmanTime()
    }

    /// Manually toggles Shabbat mode on or off.
    @MainActor
    func toggleShabbatMode() {
        isShabbatActive.toggle()
    }

    // MARK: - Private

    @MainActor
    private func fetchZmanTime() async {
        guard let repository else { return }
        error = nil

        let timezone = TimeZone.current.identifier

        do {
            let response = try await repository.fetchZmanTime(timezone: timezone)
            shabbatData = response

            #if os(iOS)
            // Sync Shabbat data to widget extension
            let widgetData = SharedShabbatData(
                isShabbat: response.isShabbat ?? false,
                isErevShabbat: response.isErevShabbat ?? false,
                candleLighting: response.candleLighting,
                havdalah: response.havdalah,
                countdown: response.countdown,
                countdownLabel: response.countdownLabel,
                parashaHebrew: response.parashaHebrew,
                parashaEnglish: response.parashaEnglish,
                city: nil
            )
            Task {
                await WidgetDataStore.shared.writeShabbatData(widgetData)
                WidgetCenter.shared.reloadTimelines(
                    ofKind: WidgetConfigurationKeys.WidgetKind.shabbatMode
                )
            }
            #endif

            if autoModeEnabled {
                isShabbatActive = response.isShabbat ?? false
            }
        } catch {
            self.error = error.localizedDescription
        }
    }
}
