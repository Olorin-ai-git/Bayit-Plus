package tv.bayit.plus.core.data.repository

import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.model.zehani.ChildAvatarSummary

interface StarStoryRepository {
    suspend fun getStarStories(): BayitResult<List<Any>>
    suspend fun getStarStory(storyId: String): BayitResult<Any>
    suspend fun markAsViewed(storyId: String): BayitResult<Unit>
    suspend fun reactToStory(storyId: String, reaction: String): BayitResult<Unit>
    suspend fun getStarProfiles(): BayitResult<List<Any>>
    suspend fun listAvatarsForProfile(profileId: String): BayitResult<List<ChildAvatarSummary>>
}
