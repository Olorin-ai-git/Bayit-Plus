import Foundation
import Observation

/// ViewModel for the Radio screen - manages station grid with live status
@Observable
final class RadioViewModel {
    private(set) var stations: [RadioStationItem] = []
    private(set) var isLoading = false
    private(set) var error: String?

    private let repository: any RadioRepository

    init(repository: any RadioRepository) {
        self.repository = repository
    }

    @MainActor
    func loadStations() async {
        guard !isLoading else { return }
        isLoading = true
        error = nil

        do {
            let response = try await repository.fetchStations()
            stations = response.stations
        } catch {
            self.error = error.localizedDescription
        }

        isLoading = false
    }

    @MainActor
    func refresh() async {
        error = nil
        isLoading = true

        do {
            let response = try await repository.fetchStations()
            stations = response.stations
        } catch {
            self.error = error.localizedDescription
        }

        isLoading = false
    }
}
