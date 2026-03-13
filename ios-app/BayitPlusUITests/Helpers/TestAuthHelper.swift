import Foundation

/// Fetches a real RS256 JWT from the Olorin Auth Service for E2E testing.
/// Called synchronously during XCUITest setUp before app launch.
/// Tries login first; falls back to register if user doesn't exist.
enum TestAuthHelper {
    private static let authBaseURL = "https://api.bayit.tv/api/v1/auth/v2"
    private static let testEmail = "e2e-test@bayit.tv"
    private static let testPassword = "E2eTestPass!2026"
    private static let testName = "E2E Test User"

    /// Fetches an access token synchronously. Returns nil on failure.
    static func fetchTestToken(
        timeout: TimeInterval = 10
    ) -> String? {
        // Try login first
        if let token = authRequest(
            endpoint: "/login",
            body: [
                "email": testEmail,
                "password": testPassword,
                "tenant_id": "bayit_plus",
            ],
            timeout: timeout
        ) {
            return token
        }

        // Fall back to register if login failed
        return authRequest(
            endpoint: "/register",
            body: [
                "email": testEmail,
                "password": testPassword,
                "name": testName,
                "tenant_id": "bayit_plus",
            ],
            timeout: timeout
        )
    }

    private static func authRequest(
        endpoint: String,
        body: [String: String],
        timeout: TimeInterval
    ) -> String? {
        let semaphore = DispatchSemaphore(value: 0)
        var resultToken: String?

        guard let url = URL(
            string: authBaseURL + endpoint
        ) else { return nil }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue(
            "application/json", forHTTPHeaderField: "Content-Type"
        )
        request.timeoutInterval = timeout
        request.httpBody = try? JSONSerialization.data(
            withJSONObject: body
        )

        let task = URLSession.shared.dataTask(with: request) {
            data, _, _ in
            defer { semaphore.signal() }
            guard let data,
                  let json = try? JSONSerialization.jsonObject(
                      with: data
                  ) as? [String: Any],
                  let token = json["access_token"] as? String
            else { return }
            resultToken = token
        }
        task.resume()
        _ = semaphore.wait(timeout: .now() + timeout)
        return resultToken
    }
}
