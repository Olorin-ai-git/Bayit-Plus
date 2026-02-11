import Foundation
import Observation

/// ViewModel for the Recordings screen - manages DVR recordings.
@MainActor
@Observable
final class RecordingsViewModel {
    private(set) var items: [RecordingItem] = []
    private(set) var isLoading = false
    private(set) var error: String?

    private let repository: any UserRepository

    init(repository: any UserRepository) {
        self.repository = repository
    }

    @MainActor
    func load() async {
        guard !isLoading else { return }
        isLoading = true
        error = nil

        do {
            let response = try await repository.fetchRecordings()
            items = response.items
        } catch {
            self.error = error.localizedDescription
        }

        isLoading = false
    }

    @MainActor
    func deleteRecording(recordingId: String) async {
        do {
            _ = try await repository.deleteRecording(recordingId: recordingId)
            items.removeAll { $0.id == recordingId }
        } catch {
            self.error = error.localizedDescription
        }
    }

    @MainActor
    func stopRecording(recordingId: String) async {
        do {
            _ = try await repository.stopRecording(recordingId: recordingId)
            await load()
        } catch {
            self.error = error.localizedDescription
        }
    }

    @MainActor
    func startRecording(channelId: String, programId: String?, duration: Int?) async {
        do {
            let request = RecordingStartRequest(
                channelId: channelId,
                programId: programId,
                duration: duration
            )
            _ = try await repository.startRecording(request: request)
            await load()
        } catch {
            self.error = error.localizedDescription
        }
    }
}
