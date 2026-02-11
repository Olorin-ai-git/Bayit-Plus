import SwiftUI
import BayitCore
import BayitNetworking

/// Debug view to test VOD API directly
struct VODDebugView: View {
    @State private var output = "Tap button to test API"
    @State private var isLoading = false

    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                Text("VOD API Debug Test")
                    .font(.title)
                    .padding()

                Button("Test API Call") {
                    Task { await testAPICall() }
                }
                .buttonStyle(.borderedProminent)
                .disabled(isLoading)

                if isLoading {
                    ProgressView()
                }

                Text(output)
                    .font(.system(.body, design: .monospaced))
                    .padding()
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(Color.black.opacity(0.7))
                    .foregroundColor(.green)
            }
            .padding()
        }
    }

    @MainActor
    func testAPICall() async {
        isLoading = true
        output = "Starting API test...\n"

        do {
            // Create configuration
            let appConfig = AppConfiguration()
            output += "✅ Config created\n"
            output += "   Base URL: \(appConfig.apiBaseURL.absoluteString)\n\n"

            // Create network configuration
            let networkConfig = AppNetworkConfiguration(appConfig: appConfig)

            let authProvider = DebugAuthTokenProvider()
            let locationProvider = DebugLocationProvider()
            let logger = DebugAPILogger()

            // Create API client
            let client = APIClient(
                configuration: networkConfig,
                authTokenProvider: authProvider,
                locationProvider: locationProvider,
                logger: logger
            )
            output += "✅ API client created\n\n"

            // Create repository
            let repository = APIContentRepository(client: client)
            output += "✅ Repository created\n\n"

            // Make the API call
            output += "🌐 Calling /api/v1/content/all?page=1&limit=5\n"
            let response = try await repository.fetchAllContent(page: 1, limit: 5)

            output += "\n✅ SUCCESS!\n"
            output += "   Items count: \(response.items.count)\n"
            output += "   Total: \(response.total)\n"
            output += "   Page: \(response.page)\n"
            output += "   Limit: \(response.limit)\n\n"

            if response.items.isEmpty {
                output += "⚠️ WARNING: Items array is EMPTY!\n"
            } else {
                output += "📦 First item:\n"
                let first = response.items[0]
                output += "   ID: \(first.id)\n"
                output += "   Title: \(first.title ?? "nil")\n"
                output += "   Category: \(first.category ?? "nil")\n"
                output += "   Year: \(first.year.map(String.init) ?? "nil")\n"
                output += "   Type: \(first.type ?? "nil")\n"
            }

        } catch {
            output += "\n❌ ERROR: \(error)\n"
            output += "   Type: \(type(of: error))\n"
            output += "   Description: \(error.localizedDescription)\n"
        }

        isLoading = false
    }
}

// Debug-only mock providers for VOD testing
private struct DebugAuthTokenProvider: AuthTokenProvider {
    func currentToken() async throws -> String? { nil }
}

private struct DebugLocationProvider: LocationProvider {
    func currentLocation() async -> UserLocation? { nil }
}

private struct DebugAPILogger: APILogger {
    func log(
        level: APILogLevel,
        message: String,
        metadata: [String: String],
        file: String,
        function: String,
        line: UInt
    ) {
        // Debug logging only - not production
    }
}

#Preview {
    VODDebugView()
}
