import BayitNetworking
import Foundation

// MARK: - Support API Implementation

extension APISettingsRepository {
    func fetchFAQ(language: String) async throws -> FAQResponse {
        let queryItems = [URLQueryItem(name: "language", value: language)]
        return try await client.get(
            "/api/v1/support/faq",
            queryItems: queryItems,
            as: FAQResponse.self
        )
    }

    func fetchTickets(
        page: Int, limit: Int
    ) async throws -> TicketsResponse {
        let queryItems = [
            URLQueryItem(name: "page", value: String(page)),
            URLQueryItem(name: "page_size", value: String(limit)),
        ]
        return try await client.get(
            "/api/v1/support/tickets",
            queryItems: queryItems,
            as: TicketsResponse.self
        )
    }

    func createTicket(
        request: CreateTicketRequest
    ) async throws -> SupportTicket {
        try await client.post(
            "/api/v1/support/tickets",
            body: request,
            as: SupportTicket.self
        )
    }
}
