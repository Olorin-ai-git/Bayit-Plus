package tv.bayit.plus.core.data.repository

import tv.bayit.plus.core.common.BayitResult

interface FamilySnapRepository {
    suspend fun getSnapFeed(): BayitResult<List<Any>>
    suspend fun createSnap(mediaId: String, timestampMs: Long, caption: String?): BayitResult<Any>
    suspend fun deleteSnap(snapId: String): BayitResult<Unit>
    suspend fun reactToSnap(snapId: String, reaction: String): BayitResult<Unit>
    suspend fun getSnapsByMember(memberId: String): BayitResult<List<Any>>
}
