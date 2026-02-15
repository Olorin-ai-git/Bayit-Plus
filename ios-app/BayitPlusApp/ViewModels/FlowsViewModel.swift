import Foundation
import Observation

/// ViewModel for the Flows screen - manages content sequences and flows.
@MainActor
@Observable
final class FlowsViewModel {
    private(set) var flows: [FlowItem] = []
    private(set) var isLoading = false
    private(set) var error: String?

    private let repository: any CategoryRepository

    init(repository: any CategoryRepository) {
        self.repository = repository
    }

    @MainActor
    func load() async {
        guard !isLoading else { return }
        isLoading = true
        error = nil

        do {
            let response = try await repository.fetchFlows()
            flows = response.flows
        } catch {
            if let message = error.userFriendlyMessage {
                self.error = message
            }
        }

        isLoading = false
    }
}
