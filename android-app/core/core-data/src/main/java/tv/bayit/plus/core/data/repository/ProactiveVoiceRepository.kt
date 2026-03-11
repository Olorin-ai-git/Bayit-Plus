package tv.bayit.plus.core.data.repository

import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.model.ProactiveVoiceContext
import tv.bayit.plus.core.model.ProactiveVoiceResponse

interface ProactiveVoiceRepository {

    suspend fun getSuggestions(
        platform: String,
        profileId: String?,
        maxSuggestions: Int = 3,
        context: ProactiveVoiceContext? = null,
    ): BayitResult<ProactiveVoiceResponse>
}
