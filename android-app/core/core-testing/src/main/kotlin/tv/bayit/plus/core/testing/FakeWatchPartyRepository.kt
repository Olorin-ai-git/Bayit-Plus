package tv.bayit.plus.core.testing

import tv.bayit.plus.core.common.BayitResult

/**
 * Fake implementation of WatchPartyRepository for testing.
 */
class FakeWatchPartyRepository {

    private val watchParties = mutableListOf<Any>()
    private val activeParty: Any? = null
    private val participants = mutableMapOf<String, MutableList<Any>>()

    var shouldReturnError = false
    var errorMessage = "Watch party repository error"

    suspend fun getWatchParties(): BayitResult<List<Any>> {
        return if (shouldReturnError) {
            BayitResult.Error(Exception(errorMessage))
        } else {
            BayitResult.Success(watchParties.toList())
        }
    }

    suspend fun createWatchParty(contentId: String, invitedFriends: List<String>): BayitResult<Any> {
        return if (shouldReturnError) {
            BayitResult.Error(Exception(errorMessage))
        } else {
            val party = mapOf(
                "id" to "party-${System.currentTimeMillis()}",
                "contentId" to contentId,
                "hostId" to "user-123",
                "participants" to invitedFriends
            )
            watchParties.add(party)
            BayitResult.Success(party)
        }
    }

    suspend fun joinWatchParty(partyId: String): BayitResult<Any> {
        return if (shouldReturnError) {
            BayitResult.Error(Exception(errorMessage))
        } else {
            val party = watchParties.find {
                (it as? Map<*, *>)?.get("id") == partyId
            }
            if (party != null) {
                BayitResult.Success(party)
            } else {
                BayitResult.Error(Exception("Party not found: $partyId"))
            }
        }
    }

    suspend fun leaveWatchParty(partyId: String): BayitResult<Unit> {
        return if (shouldReturnError) {
            BayitResult.Error(Exception(errorMessage))
        } else {
            participants.remove(partyId)
            BayitResult.Success(Unit)
        }
    }

    suspend fun syncPlaybackPosition(partyId: String, positionMs: Long): BayitResult<Unit> {
        return if (shouldReturnError) {
            BayitResult.Error(Exception(errorMessage))
        } else {
            BayitResult.Success(Unit)
        }
    }

    fun setWatchParties(parties: List<Any>) {
        watchParties.clear()
        watchParties.addAll(parties)
    }

    fun clear() {
        watchParties.clear()
        participants.clear()
        shouldReturnError = false
    }
}
