package tv.bayit.plus.feature.tv.watchnext

import android.content.ContentResolver
import android.content.ContentUris
import android.content.ContentValues
import android.content.Context
import android.net.Uri
import androidx.tvprovider.media.tv.TvContractCompat
import androidx.tvprovider.media.tv.WatchNextProgram
import dagger.hilt.android.qualifiers.ApplicationContext
import timber.log.Timber
import java.util.concurrent.TimeUnit
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Manages entries in the Android TV Watch Next channel via [TvContractCompat.WatchNextPrograms].
 *
 * Handles insert, update, and removal of Watch Next rows using the [ContentResolver] API.
 * All operations are safe to call from any thread; errors are logged and swallowed so callers
 * are not interrupted by provider failures.
 */
@Singleton
public class WatchNextManager @Inject constructor(
    @ApplicationContext private val context: Context,
) {

    private val contentResolver: ContentResolver get() = context.contentResolver

    /**
     * Inserts a new Watch Next row or updates the existing one for [contentId].
     *
     * @param contentId     Stable identifier for the content item (used as the content ID column).
     * @param title         Display title shown in the Watch Next row.
     * @param description   Short description or synopsis of the content.
     * @param thumbnailUri  HTTP/HTTPS URI string for the poster/thumbnail image.
     * @param contentType   One of: "movie", "episode", "clip", "channel", "event", "channel".
     *                      Unmapped values fall back to [TvContractCompat.WatchNextPrograms.WATCH_NEXT_TYPE_CONTINUE].
     * @param lastPositionMs Playback position in milliseconds (used for resume).
     * @param durationMs    Total content duration in milliseconds.
     */
    public fun insertOrUpdate(
        contentId: String,
        title: String,
        description: String,
        thumbnailUri: String,
        contentType: String,
        lastPositionMs: Long,
        durationMs: Long,
    ) {
        try {
            val watchNextType = mapContentType(contentType)
            val deepLinkUri = buildDeepLink(contentId, contentType, lastPositionMs)

            val builder = WatchNextProgram.Builder()
                .setTitle(title)
                .setDescription(description)
                .setPosterArtUri(Uri.parse(thumbnailUri))
                .setContentId(contentId)
                .setWatchNextType(watchNextType)
                .setLastPlaybackPositionMillis(lastPositionMs.toInt())
                .setDurationMillis(durationMs.toInt())
                .setLastEngagementTimeUtcMillis(System.currentTimeMillis())
                .setIntentUri(Uri.parse(deepLinkUri))

            val existingId = findExistingEntry(contentId)
            if (existingId != null) {
                val rowUri = TvContractCompat.buildWatchNextProgramUri(existingId)
                contentResolver.update(rowUri, builder.build().toContentValues(), null, null)
                Timber.d("WatchNext updated: contentId=%s rowId=%d", contentId, existingId)
            } else {
                val inserted = contentResolver.insert(
                    TvContractCompat.WatchNextPrograms.CONTENT_URI,
                    builder.build().toContentValues(),
                )
                Timber.d("WatchNext inserted: contentId=%s uri=%s", contentId, inserted)
            }
        } catch (e: Exception) {
            Timber.e(e, "WatchNext insertOrUpdate failed for contentId=%s", contentId)
        }
    }

    /**
     * Removes the Watch Next entry for [contentId] if one exists.
     */
    public fun remove(contentId: String) {
        try {
            val existingId = findExistingEntry(contentId) ?: return
            val rowUri = TvContractCompat.buildWatchNextProgramUri(existingId)
            val deleted = contentResolver.delete(rowUri, null, null)
            Timber.d("WatchNext removed: contentId=%s deleted=%d", contentId, deleted)
        } catch (e: Exception) {
            Timber.e(e, "WatchNext remove failed for contentId=%s", contentId)
        }
    }

    /**
     * Queries all Watch Next entries and removes those whose last engagement time is older
     * than [maxAgeDays] days.
     *
     * @param maxAgeDays Entries older than this many days are deleted. Defaults to 30.
     */
    public fun removeStaleEntries(maxAgeDays: Int = 30) {
        try {
            val cutoffMs = System.currentTimeMillis() - TimeUnit.DAYS.toMillis(maxAgeDays.toLong())
            val projection = arrayOf(
                TvContractCompat.WatchNextPrograms._ID,
                TvContractCompat.WatchNextPrograms.COLUMN_LAST_ENGAGEMENT_TIME_UTC_MILLIS,
            )
            contentResolver.query(
                TvContractCompat.WatchNextPrograms.CONTENT_URI,
                projection,
                null,
                null,
                null,
            )?.use { cursor ->
                val idCol = cursor.getColumnIndexOrThrow(TvContractCompat.WatchNextPrograms._ID)
                val timeCol = cursor.getColumnIndexOrThrow(
                    TvContractCompat.WatchNextPrograms.COLUMN_LAST_ENGAGEMENT_TIME_UTC_MILLIS,
                )
                while (cursor.moveToNext()) {
                    val id = cursor.getLong(idCol)
                    val lastEngagement = cursor.getLong(timeCol)
                    if (lastEngagement < cutoffMs) {
                        val uri = TvContractCompat.buildWatchNextProgramUri(id)
                        contentResolver.delete(uri, null, null)
                        Timber.d("WatchNext stale entry removed: rowId=%d", id)
                    }
                }
            }
        } catch (e: Exception) {
            Timber.e(e, "WatchNext removeStaleEntries failed maxAgeDays=%d", maxAgeDays)
        }
    }

    /**
     * Returns true when [progressPercent] is in the range [5%, 95%), indicating the content
     * is in progress and should appear in Watch Next.
     */
    public fun shouldInsert(progressPercent: Float): Boolean =
        progressPercent in 0.05f..0.95f

    /**
     * Returns true when [progressPercent] exceeds 95%, indicating the content is effectively
     * complete and should be removed from Watch Next.
     */
    public fun shouldRemove(progressPercent: Float): Boolean =
        progressPercent > 0.95f

    // region Private helpers

    private fun findExistingEntry(contentId: String): Long? {
        val projection = arrayOf(TvContractCompat.WatchNextPrograms._ID)
        val selection = "${TvContractCompat.WatchNextPrograms.COLUMN_CONTENT_ID} = ?"
        return try {
            contentResolver.query(
                TvContractCompat.WatchNextPrograms.CONTENT_URI,
                projection,
                selection,
                arrayOf(contentId),
                null,
            )?.use { cursor ->
                if (cursor.moveToFirst()) {
                    cursor.getLong(cursor.getColumnIndexOrThrow(TvContractCompat.WatchNextPrograms._ID))
                } else {
                    null
                }
            }
        } catch (e: Exception) {
            Timber.e(e, "WatchNext findExistingEntry failed for contentId=%s", contentId)
            null
        }
    }

    private fun mapContentType(contentType: String): Int = when (contentType.lowercase()) {
        "movie" -> TvContractCompat.WatchNextPrograms.WATCH_NEXT_TYPE_NEXT
        "episode" -> TvContractCompat.WatchNextPrograms.WATCH_NEXT_TYPE_CONTINUE
        "clip" -> TvContractCompat.WatchNextPrograms.WATCH_NEXT_TYPE_CONTINUE
        "channel" -> TvContractCompat.WatchNextPrograms.WATCH_NEXT_TYPE_CONTINUE
        "event" -> TvContractCompat.WatchNextPrograms.WATCH_NEXT_TYPE_WATCHLIST
        else -> TvContractCompat.WatchNextPrograms.WATCH_NEXT_TYPE_CONTINUE
    }

    private fun buildDeepLink(contentId: String, contentType: String, lastPositionMs: Long): String =
        "bayitplus://play/$contentId?type=$contentType&resume=$lastPositionMs"

    // endregion
}
