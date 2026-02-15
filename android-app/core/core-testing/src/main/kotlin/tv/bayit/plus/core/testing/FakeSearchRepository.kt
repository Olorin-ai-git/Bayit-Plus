package tv.bayit.plus.core.testing

import tv.bayit.plus.core.common.BayitResult

/**
 * Fake implementation of SearchRepository for testing.
 *
 * Provides controllable search results, suggestions, and search history.
 */
class FakeSearchRepository {

    private val searchResults = mutableMapOf<String, List<Any>>()
    private val recentSearches = mutableListOf<String>()
    private val popularSearches = mutableListOf<String>()

    var shouldReturnError = false
    var errorMessage = "Search repository error"

    /**
     * Search for content with optional filters.
     */
    suspend fun search(query: String, filters: Map<String, String>?): BayitResult<List<Any>> {
        return if (shouldReturnError) {
            BayitResult.Error(Exception(errorMessage))
        } else {
            recentSearches.add(0, query)
            if (recentSearches.size > 10) {
                recentSearches.removeAt(recentSearches.size - 1)
            }
            BayitResult.Success(searchResults[query] ?: emptyList())
        }
    }

    /**
     * Get search suggestions for partial query.
     */
    suspend fun getSuggestions(partialQuery: String): BayitResult<List<String>> {
        return if (shouldReturnError) {
            BayitResult.Error(Exception(errorMessage))
        } else {
            val suggestions = listOf(
                "$partialQuery movies",
                "$partialQuery series",
                "$partialQuery documentary"
            )
            BayitResult.Success(suggestions)
        }
    }

    /**
     * Get recent search history.
     */
    suspend fun getRecentSearches(): BayitResult<List<String>> {
        return if (shouldReturnError) {
            BayitResult.Error(Exception(errorMessage))
        } else {
            BayitResult.Success(recentSearches.toList())
        }
    }

    /**
     * Clear recent search history.
     */
    suspend fun clearRecentSearches(): BayitResult<Unit> {
        return if (shouldReturnError) {
            BayitResult.Error(Exception(errorMessage))
        } else {
            recentSearches.clear()
            BayitResult.Success(Unit)
        }
    }

    /**
     * Get popular search queries.
     */
    suspend fun getPopularSearches(): BayitResult<List<String>> {
        return if (shouldReturnError) {
            BayitResult.Error(Exception(errorMessage))
        } else {
            BayitResult.Success(popularSearches.toList())
        }
    }

    // Test utility methods

    fun setSearchResults(query: String, results: List<Any>) {
        searchResults[query] = results
    }

    fun setRecentSearches(searches: List<String>) {
        recentSearches.clear()
        recentSearches.addAll(searches)
    }

    fun setPopularSearches(searches: List<String>) {
        popularSearches.clear()
        popularSearches.addAll(searches)
    }

    fun clear() {
        searchResults.clear()
        recentSearches.clear()
        popularSearches.clear()
        shouldReturnError = false
    }
}
