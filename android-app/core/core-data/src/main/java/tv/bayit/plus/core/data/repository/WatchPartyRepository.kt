package tv.bayit.plus.core.data.repository

import tv.bayit.plus.core.common.BayitResult

interface WatchPartyRepository {
    suspend fun createParty(mediaId: String): BayitResult<Any>
    suspend fun joinParty(partyCode: String): BayitResult<Any>
    suspend fun leaveParty(partyId: String): BayitResult<Unit>
    suspend fun getPartyState(partyId: String): BayitResult<Any>
    suspend fun syncPlayback(partyId: String, positionMs: Long, isPlaying: Boolean): BayitResult<Unit>
    suspend fun getPartyMembers(partyId: String): BayitResult<List<Any>>
}
