import Foundation

/// Repository protocol for category-based content sections:
/// children, youngsters, judaism, flows, and morning ritual.
protocol CategoryRepository: Sendable {
    // MARK: - Children

    /// Fetch children content categories.
    func fetchChildrenCategories() async throws -> ChildrenCategoriesResponse

    /// Fetch children content with optional category and age group filters.
    func fetchChildrenContent(
        category: String?,
        ageGroup: String?,
        page: Int,
        limit: Int
    ) async throws -> ChildrenContentResponse

    /// Fetch children featured content.
    func fetchChildrenFeatured() async throws -> ChildrenFeaturedResponse

    /// Fetch available age groups for filtering.
    func fetchAgeGroups() async throws -> AgeGroupsResponse

    // MARK: - Youngsters

    /// Fetch youngsters content categories.
    func fetchYoungsterCategories() async throws -> YoungstersCategoriesResponse

    /// Fetch youngsters content with optional category filter.
    func fetchYoungsterContent(
        category: String?,
        page: Int,
        limit: Int
    ) async throws -> YoungsterContentResponse

    /// Fetch youngsters featured content.
    func fetchYoungstersFeatured() async throws -> YoungstersFeaturedResponse

    /// Fetch trending youngster content.
    func fetchYoungstersTrending() async throws -> YoungstersTrendingResponse

    /// Fetch youngsters news.
    func fetchYoungstersNews() async throws -> YoungstersNewsResponse

    // MARK: - Judaism

    /// Fetch judaism content categories.
    func fetchJudaismCategories() async throws -> JudaismCategoriesResponse

    /// Fetch judaism content with optional category filter.
    func fetchJudaismContent(
        category: String?,
        page: Int,
        limit: Int
    ) async throws -> JudaismContentResponse

    /// Fetch Jewish calendar events with related content.
    func fetchJudaismCalendar() async throws -> JudaismCalendarResponse

    /// Fetch judaism news.
    func fetchJudaismNews() async throws -> JudaismNewsResponse

    // MARK: - Flows

    /// Fetch available content flows.
    func fetchFlows() async throws -> FlowsResponse

    // MARK: - Morning Ritual

    /// Check morning ritual availability and streak.
    func checkRitual() async throws -> RitualCheckResponse

    /// Fetch today's morning ritual content.
    func fetchRitualContent() async throws -> RitualContentResponse

    /// Fetch AI-generated morning brief.
    func fetchRitualAIBrief() async throws -> RitualAIBriefResponse

    /// Fetch morning ritual preferences.
    func fetchRitualPreferences() async throws -> RitualPreferences

    /// Update morning ritual preferences.
    func updateRitualPreferences(
        request: RitualPreferencesUpdate
    ) async throws -> RitualPreferences

    // MARK: - Culture Cities

    /// Fetch cities for a culture, optionally filtered to featured cities only.
    func fetchCultureCities(cultureId: String, featuredOnly: Bool) async throws -> [CultureCity]

    /// Fetch content for a specific city within a culture.
    func fetchCityContent(
        cultureId: String,
        cityId: String,
        limit: Int?
    ) async throws -> CultureContentResponse
}
