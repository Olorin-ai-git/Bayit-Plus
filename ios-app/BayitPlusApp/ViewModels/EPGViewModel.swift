import Foundation
import Observation

/// ViewModel for the EPG (Electronic Program Guide) screen.
@MainActor
@Observable
final class EPGViewModel {
    private(set) var channels: [EPGChannelSchedule] = []
    private(set) var selectedDate: String?
    private(set) var searchResults: [EPGProgram] = []
    private(set) var currentProgram: EPGProgram?
    private(set) var nextProgram: EPGProgram?
    private(set) var isLoading = false
    private(set) var isSearching = false
    private(set) var error: String?

    private let repository: any EPGRepository

    init(repository: any EPGRepository) {
        self.repository = repository
    }

    @MainActor
    func load(date: String? = nil) async {
        guard !isLoading else { return }
        isLoading = true
        error = nil
        selectedDate = date

        do {
            let response = try await repository.fetchEPG(date: date)
            channels = response.channels
        } catch {
            if let message = error.userFriendlyMessage {
                self.error = message
            }
        }

        isLoading = false
    }

    @MainActor
    func loadChannelSchedule(channelId: String, date: String? = nil) async -> [EPGProgram] {
        do {
            let response = try await repository.fetchChannelSchedule(
                channelId: channelId,
                date: date
            )
            return response.programs
        } catch {
            if let message = error.userFriendlyMessage {
                self.error = message
            }
            return []
        }
    }

    @MainActor
    func loadCurrentProgram(channelId: String) async {
        do {
            let response = try await repository.fetchCurrentProgram(channelId: channelId)
            currentProgram = response.current
            nextProgram = response.next
        } catch {
            if let message = error.userFriendlyMessage {
                self.error = message
            }
        }
    }

    @MainActor
    func search(query: String) async {
        guard !query.isEmpty else {
            searchResults = []
            return
        }
        isSearching = true

        do {
            let response = try await repository.searchPrograms(
                query: query,
                date: selectedDate
            )
            searchResults = response.results
        } catch {
            if let message = error.userFriendlyMessage {
                self.error = message
            }
        }

        isSearching = false
    }

    @MainActor
    func fetchCatchUpURL(programId: String) async -> String? {
        do {
            let response = try await repository.fetchCatchUp(programId: programId)
            return response.streamUrl
        } catch {
            if let message = error.userFriendlyMessage {
                self.error = message
            }
            return nil
        }
    }
}
