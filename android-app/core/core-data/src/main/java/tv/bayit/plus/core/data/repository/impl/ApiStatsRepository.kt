package tv.bayit.plus.core.data.repository.impl

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import retrofit2.http.GET
import retrofit2.http.Query
import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.common.runCatchingResult
import tv.bayit.plus.core.data.repository.StatsRepository
import tv.bayit.plus.core.network.api.BayitApiClient
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Production implementation of [StatsRepository] backed by Retrofit.
 *
 * Delegates HTTP communication to [BayitApiClient], which handles auth headers,
 * correlation IDs, retry, rate limiting, and structured error mapping. Every
 * public method wraps the network call in [runCatchingResult] so callers receive
 * a [BayitResult] instead of raw exceptions.
 *
 * Endpoint paths mirror the iOS APIStatsRepository and web api.js.
 */
@Singleton
class ApiStatsRepository @Inject constructor(
    private val client: BayitApiClient,
) : StatsRepository {

    private val service: StatsService = client.createService()

    override suspend fun getWatchStats(period: String): BayitResult<Any> =
        runCatchingResult {
            client.safeApiCall { service.getWatchStats(period) }
        }

    override suspend fun getGenreBreakdown(): BayitResult<List<Any>> = runCatchingResult {
        val response = client.safeApiCall { service.getGenreBreakdown() }
        response.genres
    }

    override suspend fun getWeeklyReport(): BayitResult<Any> = runCatchingResult {
        client.safeApiCall { service.getWeeklyReport() }
    }

    override suspend fun getTotalWatchTime(): BayitResult<Long> = runCatchingResult {
        val response = client.safeApiCall { service.getTotalWatchTime() }
        response.totalSeconds
    }

    override suspend fun getStreakInfo(): BayitResult<Any> = runCatchingResult {
        client.safeApiCall { service.getStreakInfo() }
    }
}

private interface StatsService {

    @GET("api/v1/stats/watch")
    suspend fun getWatchStats(@Query("period") period: String): WatchStatsResponse

    @GET("api/v1/stats/genres")
    suspend fun getGenreBreakdown(): GenreBreakdownResponse

    @GET("api/v1/stats/weekly")
    suspend fun getWeeklyReport(): WeeklyReportResponse

    @GET("api/v1/stats/total-time")
    suspend fun getTotalWatchTime(): TotalWatchTimeResponse

    @GET("api/v1/stats/streak")
    suspend fun getStreakInfo(): StreakInfoResponse
}

/** Response from the watch stats endpoint for a given period. */
@Serializable
private data class WatchStatsResponse(
    @SerialName("total_minutes") val totalMinutes: Long = 0,
    @SerialName("session_count") val sessionCount: Int = 0,
    @SerialName("average_session_minutes") val averageSessionMinutes: Double = 0.0,
    val period: String? = null,
)

/** Response wrapper for genre breakdown statistics. */
@Serializable
private data class GenreBreakdownResponse(
    val genres: List<GenreStatItem> = emptyList(),
)

/** A single genre's watch statistics. */
@Serializable
private data class GenreStatItem(
    val genre: String,
    val minutes: Long = 0,
    val percentage: Double = 0.0,
)

/** Weekly report response with daily breakdowns. */
@Serializable
private data class WeeklyReportResponse(
    @SerialName("week_start") val weekStart: String? = null,
    @SerialName("week_end") val weekEnd: String? = null,
    @SerialName("total_minutes") val totalMinutes: Long = 0,
    @SerialName("daily_breakdown") val dailyBreakdown: List<DailyStatItem> = emptyList(),
)

/** A single day's watch statistics within a weekly report. */
@Serializable
private data class DailyStatItem(
    val date: String,
    val minutes: Long = 0,
)

/** Response from the total watch time endpoint. */
@Serializable
private data class TotalWatchTimeResponse(
    @SerialName("total_seconds") val totalSeconds: Long = 0,
)

/** Response from the streak info endpoint. */
@Serializable
private data class StreakInfoResponse(
    @SerialName("current_streak") val currentStreak: Int = 0,
    @SerialName("longest_streak") val longestStreak: Int = 0,
    @SerialName("last_watch_date") val lastWatchDate: String? = null,
)
