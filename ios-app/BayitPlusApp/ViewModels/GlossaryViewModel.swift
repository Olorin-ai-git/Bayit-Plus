import BayitCore
import BayitNetworking
import Foundation

struct GlossaryEntry: Codable, Identifiable {
    var id: String { phrase }
    let phrase: String
    let transliteration: String
    let translation: String
    let origin: String
    let usageExample: String
    let funFact: String
    let tags: [String]

    enum CodingKeys: String, CodingKey {
        case phrase, transliteration, translation, origin, tags
        case usageExample = "usage_example"
        case funFact = "fun_fact"
    }
}

@Observable
final class GlossaryViewModel {
    var entries: [GlossaryEntry] = []
    var searchQuery: String = ""
    var activeCategory: String = "All"
    var isLoading: Bool = false
    var errorMessage: String?
    private var currentSkip: Int = 0
    private let pageSize: Int = 20
    var hasMore: Bool = true
    private let client: APIClient

    static let categories = ["All", "Slang", "Food", "Holidays", "Music", "History", "Proverbs"]

    init(client: APIClient) {
        self.client = client
    }

    func fetchEntries(reset: Bool = false) async {
        if reset {
            currentSkip = 0
            entries = []
        }
        isLoading = true
        errorMessage = nil

        do {
            var params: [String: String] = [
                "limit": "\(pageSize)",
                "skip": "\(currentSkip)"
            ]
            if !searchQuery.isEmpty { params["query"] = searchQuery }
            if activeCategory != "All" { params["tags"] = activeCategory.lowercased() }

            let queryItems = params.map { URLQueryItem(name: $0.key, value: $0.value) }
            let data: [GlossaryEntry] = try await client.get(
                "/api/v1/cultural/glossary",
                queryItems: queryItems,
                as: [GlossaryEntry].self
            )
            if reset {
                entries = data
            } else {
                entries.append(contentsOf: data)
            }
            currentSkip += pageSize
            hasMore = data.count == pageSize
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }

    func loadMore() async {
        guard hasMore, !isLoading else { return }
        await fetchEntries(reset: false)
    }

    func search() async {
        await fetchEntries(reset: true)
    }

    func selectCategory(_ category: String) async {
        activeCategory = category
        await fetchEntries(reset: true)
    }
}
