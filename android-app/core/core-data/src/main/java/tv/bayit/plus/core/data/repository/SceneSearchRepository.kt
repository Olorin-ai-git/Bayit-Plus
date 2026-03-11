package tv.bayit.plus.core.data.repository

import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.model.SceneSearchResult

interface SceneSearchRepository {

    suspend fun searchScenes(
        channelId: String,
        query: String,
    ): BayitResult<List<SceneSearchResult>>
}
