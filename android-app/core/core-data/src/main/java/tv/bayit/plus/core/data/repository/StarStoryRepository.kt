package tv.bayit.plus.core.data.repository

import tv.bayit.plus.core.common.BayitResult

interface StarStoryRepository {
    suspend fun getStarStories(): BayitResult<List<Any>>
    suspend fun getStarStory(storyId: String): BayitResult<Any>
    suspend fun markAsViewed(storyId: String): BayitResult<Unit>
    suspend fun reactToStory(storyId: String, reaction: String): BayitResult<Unit>
    suspend fun getStarProfiles(): BayitResult<List<Any>>
}
