import BayitNetworking
import Foundation

/// Repository protocol for widget API operations.
///
/// Abstracts API calls for widget management behind a protocol for testability.
protocol WidgetRepository: Sendable {

    /// Fetch the current user's widgets.
    ///
    /// - Returns: Response with list of user widgets and total count.
    /// - Throws: `NetworkError` if the request fails.
    func fetchMyWidgets() async throws -> WidgetsListResponse

    /// Fetch all available system widgets with their subscription status.
    ///
    /// - Returns: Response with available system widgets and total count.
    /// - Throws: `NetworkError` if the request fails.
    func fetchAvailableSystemWidgets() async throws -> AvailableSystemWidgetsResponse

    /// Add a system widget to the user's dock.
    ///
    /// - Parameter widgetId: The system widget ID to add.
    /// - Returns: The created widget item and confirmation message.
    /// - Throws: `NetworkError` if the request fails.
    func addSystemWidget(widgetId: String) async throws -> WidgetActionResponse

    /// Remove a system widget from the user's dock.
    ///
    /// - Parameter widgetId: The system widget ID to remove.
    /// - Returns: Confirmation message.
    /// - Throws: `NetworkError` if the request fails.
    func removeSystemWidget(widgetId: String) async throws -> WidgetDeleteResponse

    /// Toggle the minimized state of a widget.
    ///
    /// - Parameters:
    ///   - widgetId: The widget ID to toggle.
    ///   - isMinimized: Whether the widget should be minimized.
    /// - Returns: Confirmation message.
    /// - Throws: `NetworkError` if the request fails.
    func toggleMinimize(widgetId: String, isMinimized: Bool) async throws -> MessageResponse
}

/// Production implementation of `WidgetRepository` using `APIClient`.
final class APIWidgetRepository: WidgetRepository, @unchecked Sendable {

    private let client: APIClient

    /// Initialize with an `APIClient` instance.
    ///
    /// - Parameter client: The actor-based API client for network requests.
    init(client: APIClient) {
        self.client = client
    }

    // MARK: - WidgetRepository

    func fetchMyWidgets() async throws -> WidgetsListResponse {
        return try await client.get(
            "/api/v1/widgets",
            as: WidgetsListResponse.self
        )
    }

    func fetchAvailableSystemWidgets() async throws -> AvailableSystemWidgetsResponse {
        return try await client.get(
            "/api/v1/widgets/system/available",
            as: AvailableSystemWidgetsResponse.self
        )
    }

    func addSystemWidget(widgetId: String) async throws -> WidgetActionResponse {
        return try await client.post(
            "/api/v1/widgets/system/\(widgetId)/add",
            body: EmptyBody(),
            as: WidgetActionResponse.self
        )
    }

    func removeSystemWidget(widgetId: String) async throws -> WidgetDeleteResponse {
        return try await client.delete(
            "/api/v1/widgets/system/\(widgetId)/remove",
            as: WidgetDeleteResponse.self
        )
    }

    func toggleMinimize(widgetId: String, isMinimized: Bool) async throws -> MessageResponse {
        return try await client.post(
            "/api/v1/widgets/\(widgetId)/minimize",
            body: EmptyBody(),
            queryItems: [URLQueryItem(name: "is_minimized", value: String(isMinimized))],
            as: MessageResponse.self
        )
    }
}
