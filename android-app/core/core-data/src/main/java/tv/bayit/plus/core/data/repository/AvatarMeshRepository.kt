package tv.bayit.plus.core.data.repository

import tv.bayit.plus.core.common.BayitResult

interface AvatarMeshRepository {
    suspend fun getAvatarMesh(avatarId: String): BayitResult<Any>
    suspend fun getAvailableMeshes(): BayitResult<List<Any>>
    suspend fun updateMesh(avatarId: String, meshConfig: Map<String, Any>): BayitResult<Any>
    suspend fun getMeshAnimations(meshId: String): BayitResult<List<Any>>
    suspend fun getCustomizationOptions(): BayitResult<Any>
}
