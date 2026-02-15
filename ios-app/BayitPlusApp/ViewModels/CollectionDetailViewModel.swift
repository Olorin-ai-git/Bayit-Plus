import Foundation
import Observation

/// ViewModel for collection detail screen
@MainActor
@Observable
final class CollectionDetailViewModel {
    private(set) var collection: CollectionDetail?
    private(set) var isLoading = false
    private(set) var error: String?

    private let collectionId: String
    private let repository: any ContentRepository

    init(collectionId: String, repository: any ContentRepository) {
        self.collectionId = collectionId
        self.repository = repository
    }

    @MainActor
    func loadCollection() async {
        guard !isLoading else { return }
        isLoading = true
        error = nil

        do {
            collection = try await repository.fetchCollectionDetail(id: collectionId)
        } catch {
            if let message = error.userFriendlyMessage {
                self.error = message
            }
        }

        isLoading = false
    }
}
