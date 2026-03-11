import XCTest

@MainActor
enum DiscoverTestFixtures {
    struct Fixtures: Decodable {
        let user_id: String
        let user_email: String
        let profile_id: String
        let subscription_id: String
        let avatar_id: String
        let live_channel: String
        let live_channel_aliases: [String]
        let seeded_at: String
    }

    private static var _cached: Fixtures?

    static func load() -> Fixtures {
        if let cached = _cached { return cached }

        let bundle = Bundle(for: DiscoverTabTests.self)

        guard let url = bundle.url(
            forResource: "test-fixtures",
            withExtension: "json"
        ) else {
            // Fallback: read from project root
            let projectPath = ProcessInfo.processInfo.environment["PROJECT_DIR"]
                ?? "/Users/olorin/Documents/Projects/olorin/olorin-media/bayit-plus"
            let filePath = "\(projectPath)/tests/e2e/fixtures/test-fixtures.json"

            guard let data = FileManager.default.contents(atPath: filePath) else {
                XCTFail("test-fixtures.json not found. Run seed-test-data.py first.")
                fatalError("test-fixtures.json not found")
            }

            let fixtures = try! JSONDecoder().decode(Fixtures.self, from: data)
            _cached = fixtures
            return fixtures
        }

        let data = try! Data(contentsOf: url)
        let fixtures = try! JSONDecoder().decode(Fixtures.self, from: data)
        _cached = fixtures
        return fixtures
    }

    static var liveChannel: String {
        load().live_channel
    }

    static var userId: String {
        load().user_id
    }

    static var avatarId: String {
        load().avatar_id
    }
}
