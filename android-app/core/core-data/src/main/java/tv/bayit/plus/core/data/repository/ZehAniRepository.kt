package tv.bayit.plus.core.data.repository

import tv.bayit.plus.core.common.BayitResult

interface ZehAniRepository {
    suspend fun identifyPerson(imageData: ByteArray): BayitResult<Any>
    suspend fun getPersonDetails(personId: String): BayitResult<Any>
    suspend fun getPersonFilmography(personId: String): BayitResult<List<Any>>
    suspend fun identifyFromTimestamp(mediaId: String, timestampMs: Long): BayitResult<List<Any>>
    suspend fun getRecognitionHistory(): BayitResult<List<Any>>
}
