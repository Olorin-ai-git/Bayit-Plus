import Foundation
import Observation

/// ViewModel for the actor detail screen
@MainActor
@Observable
final class ActorDetailViewModel {
    private(set) var actor: ActorDetail?
    private(set) var isLoading = false
    private(set) var error: String?

    private let actorName: String
    private let repository: any ActorRepository

    init(actorName: String, repository: any ActorRepository) {
        self.actorName = actorName
        self.repository = repository
    }

    @MainActor
    func loadActor() async {
        guard !isLoading else { return }
        isLoading = true
        error = nil

        do {
            actor = try await repository.fetchActorDetail(name: actorName)
        } catch {
            if let message = error.userFriendlyMessage {
                self.error = message
            }
        }

        isLoading = false
    }
}
