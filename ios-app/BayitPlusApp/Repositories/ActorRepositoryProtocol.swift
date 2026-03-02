import Foundation

/// Repository protocol for actor-related API calls
protocol ActorRepository: Sendable {
    /// Fetch paginated list of top actors by movie count
    func fetchActors(skip: Int, limit: Int) async throws -> [ActorListItem]

    /// Fetch weighted-random actor recommendations for the carousel
    func fetchActorRecommendations(limit: Int) async throws -> [ActorListItem]

    /// Fetch full detail for a single actor including filmography
    func fetchActorDetail(name: String) async throws -> ActorDetail
}
