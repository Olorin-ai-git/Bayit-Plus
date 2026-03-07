import BayitCore
import Foundation

/// Handles Plex PIN-based OAuth authentication for tvOS.
/// Flow: request PIN -> user enters code at plex.tv/link -> poll for token.
public actor PlexAuthService {
    private let logger = BayitLogger(category: "PlexAuthService")
    private let session: URLSession
    private let clientId: String
    private let productName: String

    private static let pinURL = "https://plex.tv/api/v2/pins"
    private static let pollInterval: TimeInterval = 3
    private static let maxPollAttempts = 100

    public init(
        clientId: String,
        productName: String,
        session: URLSession = .shared
    ) {
        self.clientId = clientId
        self.productName = productName
        self.session = session
    }

    /// Request a new PIN from Plex for device linking.
    public func requestPIN() async throws -> PlexPIN {
        var request = URLRequest(url: URL(string: Self.pinURL)!)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        addClientHeaders(&request)

        request.httpBody = try JSONSerialization.data(
            withJSONObject: ["strong": false]
        )
        request.setValue(
            "application/json",
            forHTTPHeaderField: "Content-Type"
        )

        let (data, response) = try await session.data(for: request)
        try validateResponse(response)

        let json = try JSONSerialization.jsonObject(
            with: data
        ) as? [String: Any] ?? [:]

        guard let id = json["id"] as? Int,
              let code = json["code"] as? String
        else {
            throw PlexAuthError.invalidPINResponse
        }

        let expiresIn = json["expires_in"] as? Int ?? 1800
        let pin = PlexPIN(
            id: id,
            code: code,
            authToken: nil,
            expiresAt: Date().addingTimeInterval(TimeInterval(expiresIn))
        )

        logger.info(
            "Requested Plex PIN",
            context: ["pinId": "\(id)", "code": code]
        )
        return pin
    }

    /// Poll Plex until the user enters the PIN or it expires.
    public func pollForToken(pinId: Int) async throws -> String {
        let url = URL(string: "\(Self.pinURL)/\(pinId)")!

        for attempt in 0 ..< Self.maxPollAttempts {
            try Task.checkCancellation()
            if attempt > 0 {
                try await Task.sleep(
                    nanoseconds: UInt64(Self.pollInterval * 1_000_000_000)
                )
            }

            var request = URLRequest(url: url)
            request.httpMethod = "GET"
            request.setValue(
                "application/json",
                forHTTPHeaderField: "Accept"
            )
            addClientHeaders(&request)

            let (data, response) = try await session.data(for: request)
            try validateResponse(response)

            let json = try JSONSerialization.jsonObject(
                with: data
            ) as? [String: Any] ?? [:]

            if let token = json["authToken"] as? String, !token.isEmpty {
                logger.info(
                    "Plex PIN authenticated",
                    context: ["pinId": "\(pinId)", "attempt": "\(attempt)"]
                )
                return token
            }
        }
        throw PlexAuthError.pinExpired
    }

    private func addClientHeaders(_ request: inout URLRequest) {
        request.setValue(clientId, forHTTPHeaderField: "X-Plex-Client-Identifier")
        request.setValue(productName, forHTTPHeaderField: "X-Plex-Product")
        request.setValue("tvOS", forHTTPHeaderField: "X-Plex-Platform")
    }

    private func validateResponse(_ response: URLResponse) throws {
        guard let http = response as? HTTPURLResponse else {
            throw PlexAuthError.networkError
        }
        guard (200 ... 299).contains(http.statusCode) else {
            throw PlexAuthError.httpError(statusCode: http.statusCode)
        }
    }
}

/// Errors specific to Plex authentication.
public enum PlexAuthError: Error, Sendable {
    case invalidPINResponse
    case pinExpired
    case networkError
    case httpError(statusCode: Int)
}
