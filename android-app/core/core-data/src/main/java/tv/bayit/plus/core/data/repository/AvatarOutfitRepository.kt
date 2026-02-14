package tv.bayit.plus.core.data.repository

import tv.bayit.plus.core.common.BayitResult

interface AvatarOutfitRepository {
    suspend fun getAvailableOutfits(): BayitResult<List<Any>>
    suspend fun getEquippedOutfit(): BayitResult<Any>
    suspend fun equipOutfit(outfitId: String): BayitResult<Unit>
    suspend fun purchaseOutfit(outfitId: String): BayitResult<Any>
    suspend fun getOwnedOutfits(): BayitResult<List<Any>>
    suspend fun getOutfitsByCategory(category: String): BayitResult<List<Any>>
}
