import Foundation
import SwiftUI

// MARK: - Logic & Timer

extension ShabbatEveView {
    func shouldShowSection(_ vm: ShabbatViewModel) -> Bool {
        guard let candleTime = vm.candleLightingTime else { return false }

        guard let candleDate = ISO8601DateFormatter().date(from: candleTime) else {
            return false
        }

        let now = Date()
        let timeUntilCandles = candleDate.timeIntervalSince(now)

        let sixHours: TimeInterval = 6 * 60 * 60
        return timeUntilCandles > 0 && timeUntilCandles <= sixHours
    }

    func getParasha(_ vm: ShabbatViewModel) -> String? {
        let locale = Locale.current.language.languageCode?.identifier ?? "en"
        if locale == "he", let hebrewName = vm.parashaNameHebrew {
            return hebrewName
        }
        return vm.parashaNameEnglish
    }

    func startCountdownTimer(_ vm: ShabbatViewModel) {
        updateCountdown(vm)

        timer = Timer.scheduledTimer(withTimeInterval: 60.0, repeats: true) { _ in
            updateCountdown(vm)
        }
    }

    func stopCountdownTimer() {
        timer?.invalidate()
        timer = nil
    }

    func updateCountdown(_ vm: ShabbatViewModel) {
        guard let candleTime = vm.candleLightingTime,
              let candleDate = ISO8601DateFormatter().date(from: candleTime)
        else {
            countdown = ""
            return
        }

        let now = Date()
        let timeRemaining = candleDate.timeIntervalSince(now)

        if timeRemaining <= 0 {
            countdown = ""
            return
        }

        let hours = Int(timeRemaining) / 3600
        let minutes = (Int(timeRemaining) % 3600) / 60

        if hours > 0 {
            countdown = "\(hours)h \(minutes)m"
        } else {
            countdown = "\(minutes)m"
        }
    }
}

// MARK: - Auto Load Extension

extension ShabbatEveView {
    /// Creates the ViewModel from RepositoryProvider and loads zmanim data.
    func withAutoLoad() -> some View {
        task {
            if viewModel == nil {
                viewModel = ShabbatViewModel(repository: repos.shabbat)
            }
            await viewModel?.loadZmanim()
        }
    }
}
