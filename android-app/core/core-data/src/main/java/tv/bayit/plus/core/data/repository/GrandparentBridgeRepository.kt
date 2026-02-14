package tv.bayit.plus.core.data.repository

import tv.bayit.plus.core.common.BayitResult

interface GrandparentBridgeRepository {
    suspend fun getSimplifiedInterface(): BayitResult<Any>
    suspend fun getBridgeConnections(): BayitResult<List<Any>>
    suspend fun createBridgeInvite(grandparentName: String): BayitResult<String>
    suspend fun acceptBridgeInvite(inviteCode: String): BayitResult<Any>
    suspend fun getSharedContent(connectionId: String): BayitResult<List<Any>>
    suspend fun shareContent(connectionId: String, mediaId: String, message: String?): BayitResult<Unit>
}
