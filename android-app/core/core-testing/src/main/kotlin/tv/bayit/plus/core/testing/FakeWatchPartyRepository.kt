package tv.bayit.plus.core.testing

import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.model.WatchParty
import tv.bayit.plus.core.model.Friend

/**
 * Fake implementation of WatchPartyRepository for testing.
 */
class FakeWatchPartyRepository {

    private val watchParties = mutableListOf<WatchParty>()
    private val participants = mutableMapOf<String, MutableList<Friend>>()

    var shouldReturnError = false
    var errorMessage = "Watch party repository error"

    suspend fun getWatchParties(): BayitResult<List<WatchParty>> {
        return if (shouldReturnError) {
            BayitResult.Error(Exception(errorMessage))
        } else {
            BayitResult.Success(watchParties.toList())
        }
    }

    suspend fun createWatchParty(contentId: String, invitedFriends: List<String>): BayitResult<WatchParty> {
        return if (shouldReturnError) {
            BayitResult.Error(Exception(errorMessage))
        } else {
            val party = WatchParty(
                id = "party-${System.currentTimeMillis()}",
                contentId = contentId,
                hostId = "user-123",
                participants = emptyList(),
                status = "active",
                createdAt = System.currentTimeMillis().toString()
            )
            watchParties.add(party)
            BayitResult.Success(party)
        }
    }

    suspend fun joinWatchParty(partyId: String): BayitResult<WatchParty> {
        return if (shouldReturnError) {
            BayitResult.Error(Exception(errorMessage))
        } else {
            val party = watchParties.find { it.id == partyId }
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

    fun setWatchParties(parties: List<WatchParty>) {
        watchParties.clear()
        watchParties.addAll(parties)
    }

    fun setParticipants(partyId: String, friendsList: List<Friend>) {
        participants[partyId] = friendsList.toMutableList()
    }

    fun clear() {
        watchParties.clear()
        participants.clear()
        shouldReturnError = false
    }
}
