package tv.bayit.plus.core.data.repository.impl

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query
import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.common.runCatchingResult
import tv.bayit.plus.core.data.repository.GamificationRepository
import tv.bayit.plus.core.network.api.BayitApiClient

/**
 * Production implementation of [GamificationRepository] backed by Retrofit.
 *
 * Delegates HTTP communication to [BayitApiClient], which handles auth headers,
 * correlation IDs, retry, rate limiting, and structured error mapping. Every
 * public method wraps the network call in [runCatchingResult] so callers receive
 * a [BayitResult] instead of raw exceptions.
 *
 * Endpoint paths mirror the iOS APIGamificationRepository and web api.js.
 */
class ApiGamificationRepository(
    private val client: BayitApiClient,
) : GamificationRepository {

    private val service: GamificationService = client.createService()

    override suspend fun getPlayerProfile(): BayitResult<Any> =
        runCatchingResult {
            client.safeApiCall { service.getProfile() }
        }

    override suspend fun getLevel(): BayitResult<Int> =
        runCatchingResult {
            val response = client.safeApiCall { service.getLevel() }
            response.level
        }

    override suspend fun getXpProgress(): BayitResult<Any> =
        runCatchingResult {
            client.safeApiCall { service.getXpProgress() }
        }

    override suspend fun getAchievements(): BayitResult<List<Any>> =
        runCatchingResult {
            val response = client.safeApiCall { service.getAchievements() }
            response.items
        }

    override suspend fun claimAchievement(achievementId: String): BayitResult<Any> =
        runCatchingResult {
            client.safeApiCall { service.claimAchievement(achievementId) }
        }

    override suspend fun getLeaderboard(scope: String): BayitResult<List<Any>> =
        runCatchingResult {
            val response = client.safeApiCall {
                service.getLeaderboard(scope)
            }
            response.entries
        }

    override suspend fun getBadges(): BayitResult<List<Any>> =
        runCatchingResult {
            val response = client.safeApiCall { service.getBadges() }
            response.items
        }
}

private interface GamificationService {

    @GET("api/v1/gamification/profile")
    suspend fun getProfile(): GamificationProfileResponse

    @GET("api/v1/gamification/level")
    suspend fun getLevel(): GamificationLevelResponse

    @GET("api/v1/gamification/xp")
    suspend fun getXpProgress(): GamificationXpResponse

    @GET("api/v1/gamification/achievements")
    suspend fun getAchievements(): GamificationAchievementsResponse

    @POST("api/v1/gamification/achievement/{id}/claim")
    suspend fun claimAchievement(
        @Path("id") achievementId: String,
    ): GamificationClaimResponse

    @GET("api/v1/gamification/leaderboard")
    suspend fun getLeaderboard(
        @Query("scope") scope: String,
    ): GamificationLeaderboardResponse

    @GET("api/v1/gamification/badges")
    suspend fun getBadges(): GamificationBadgesResponse
}

/** Player gamification profile containing summary stats. */
@Serializable
private data class GamificationProfileResponse(
    val level: Int = 1,
    val xp: Long = 0,
    @SerialName("xp_to_next_level") val xpToNextLevel: Long = 0,
    @SerialName("total_achievements") val totalAchievements: Int = 0,
    @SerialName("total_badges") val totalBadges: Int = 0,
    val rank: Int? = null,
    val title: String? = null,
)

/** Response containing the current level. */
@Serializable
private data class GamificationLevelResponse(
    val level: Int = 1,
    @SerialName("level_name") val levelName: String? = null,
    @SerialName("xp_required") val xpRequired: Long = 0,
)

/** XP progress detail. */
@Serializable
private data class GamificationXpResponse(
    @SerialName("current_xp") val currentXp: Long = 0,
    @SerialName("xp_to_next_level") val xpToNextLevel: Long = 0,
    @SerialName("daily_xp") val dailyXp: Long = 0,
    @SerialName("weekly_xp") val weeklyXp: Long = 0,
    @SerialName("recent_gains") val recentGains: List<XpGainEntry> = emptyList(),
)

/** A single XP gain event. */
@Serializable
private data class XpGainEntry(
    val amount: Long = 0,
    val reason: String? = null,
    @SerialName("earned_at") val earnedAt: String? = null,
)

/** List wrapper for achievements. */
@Serializable
private data class GamificationAchievementsResponse(
    val items: List<AchievementResponse> = emptyList(),
)

/** A single achievement. */
@Serializable
private data class AchievementResponse(
    val id: String,
    val name: String? = null,
    val description: String? = null,
    @SerialName("icon_url") val iconUrl: String? = null,
    @SerialName("is_unlocked") val isUnlocked: Boolean = false,
    @SerialName("unlocked_at") val unlockedAt: String? = null,
    @SerialName("xp_reward") val xpReward: Long = 0,
    val progress: Double? = null,
    @SerialName("is_claimed") val isClaimed: Boolean = false,
)

/** Response from claiming an achievement reward. */
@Serializable
private data class GamificationClaimResponse(
    @SerialName("xp_earned") val xpEarned: Long = 0,
    @SerialName("new_total_xp") val newTotalXp: Long = 0,
    val message: String? = null,
)

/** List wrapper for leaderboard entries. */
@Serializable
private data class GamificationLeaderboardResponse(
    val entries: List<LeaderboardEntry> = emptyList(),
    val scope: String? = null,
)

/** A single leaderboard entry. */
@Serializable
private data class LeaderboardEntry(
    val rank: Int,
    @SerialName("user_id") val userId: String,
    @SerialName("display_name") val displayName: String? = null,
    @SerialName("avatar_url") val avatarUrl: String? = null,
    val xp: Long = 0,
    val level: Int = 1,
)

/** List wrapper for badges. */
@Serializable
private data class GamificationBadgesResponse(
    val items: List<BadgeResponse> = emptyList(),
)

/** A single badge. */
@Serializable
private data class BadgeResponse(
    val id: String,
    val name: String? = null,
    val description: String? = null,
    @SerialName("icon_url") val iconUrl: String? = null,
    val tier: String? = null,
    @SerialName("is_earned") val isEarned: Boolean = false,
    @SerialName("earned_at") val earnedAt: String? = null,
)
