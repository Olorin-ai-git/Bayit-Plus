package tv.bayit.plus.feature.tv.search

import android.app.SearchManager
import android.content.ContentProvider
import android.content.ContentValues
import android.content.UriMatcher
import android.database.Cursor
import android.database.MatrixCursor
import android.net.Uri
import android.provider.BaseColumns
import timber.log.Timber

/**
 * ContentProvider for Android TV global search integration.
 *
 * Registered in AndroidManifest.xml with:
 *   android:authorities="tv.bayit.plus.search"
 *   android:exported="true"
 *
 * The system calls [query] with the user's search term in [selectionArgs][0].
 * Results are returned as a [MatrixCursor] matching the TV search column contract.
 */
class BayitSearchProvider : ContentProvider() {

    companion object {
        private const val AUTHORITY = "tv.bayit.plus.search"
        private const val SEARCH_URI_CODE = 1
        private const val MAX_RESULTS = 10

        private val URI_MATCHER = UriMatcher(UriMatcher.NO_MATCH).apply {
            addURI(AUTHORITY, SearchManager.SUGGEST_URI_PATH_QUERY, SEARCH_URI_CODE)
            addURI(AUTHORITY, "${SearchManager.SUGGEST_URI_PATH_QUERY}/*", SEARCH_URI_CODE)
        }

        private val SEARCH_COLUMNS = arrayOf(
            BaseColumns._ID,
            SearchManager.SUGGEST_COLUMN_TEXT_1,
            SearchManager.SUGGEST_COLUMN_TEXT_2,
            SearchManager.SUGGEST_COLUMN_RESULT_CARD_IMAGE,
            SearchManager.SUGGEST_COLUMN_INTENT_DATA,
            SearchManager.SUGGEST_COLUMN_CONTENT_TYPE,
            SearchManager.SUGGEST_COLUMN_IS_LIVE,
            SearchManager.SUGGEST_COLUMN_VIDEO_WIDTH,
            SearchManager.SUGGEST_COLUMN_VIDEO_HEIGHT,
        )
    }

    override fun onCreate(): Boolean = true

    /**
     * Handles TV global search queries from the system.
     *
     * The query term arrives either in [selectionArgs][0] (preferred by the platform)
     * or as the last path segment of [uri] as a fallback.
     *
     * Real search integration: obtain [TVSearchHelper] from the application context
     * and call [TVSearchHelper.search] — the helper is wired via Hilt at the
     * Application level and exposes a synchronous query method safe to call here.
     */
    override fun query(
        uri: Uri,
        projection: Array<String>?,
        selection: String?,
        selectionArgs: Array<String>?,
        sortOrder: String?,
    ): Cursor? {
        if (URI_MATCHER.match(uri) != SEARCH_URI_CODE) {
            Timber.w("BayitSearchProvider received unknown URI: %s", uri)
            return null
        }

        val query = selectionArgs?.firstOrNull()?.takeIf { it.isNotBlank() }
            ?: uri.lastPathSegment?.takeIf { it.isNotBlank() }
            ?: return emptySearchCursor()

        Timber.d("BayitSearchProvider query: %s", query)

        // Real integration point: retrieve TVSearchHelper from the application context
        // and delegate to its synchronous search(query, limit = MAX_RESULTS) method.
        // The helper is provided via Hilt EntryPoint on the Application class.
        // Example:
        //   val helper = EntryPoints.get(context!!.applicationContext, SearchHelperEntryPoint::class.java)
        //       .tvSearchHelper()
        //   return helper.searchAsCursor(query, MAX_RESULTS, SEARCH_COLUMNS)

        return buildDemoCursor(query)
    }

    // region Read-only stubs (ContentProvider contract)

    override fun insert(uri: Uri, values: ContentValues?): Uri? = null

    override fun update(uri: Uri, values: ContentValues?, selection: String?, selectionArgs: Array<String>?): Int = 0

    override fun delete(uri: Uri, selection: String?, selectionArgs: Array<String>?): Int = 0

    override fun getType(uri: Uri): String? = null

    // endregion

    // region Cursor builders

    private fun emptySearchCursor(): MatrixCursor = MatrixCursor(SEARCH_COLUMNS)

    /**
     * Builds a representative cursor demonstrating the required column format.
     * Replace with real search results from [TVSearchHelper].
     */
    private fun buildDemoCursor(query: String): MatrixCursor {
        val cursor = MatrixCursor(SEARCH_COLUMNS)
        val liveContentId = "live-channel-demo"
        val vodContentId = "vod-content-demo"

        cursor.addRow(
            arrayOf(
                1L,
                "Live: $query",
                "Live Channel",
                "",
                buildDeepLink(liveContentId, "live"),
                "video/mp4",
                "1",
                "1920",
                "1080",
            )
        )

        cursor.addRow(
            arrayOf(
                2L,
                query,
                "VOD",
                "",
                buildDeepLink(vodContentId, "vod"),
                "video/mp4",
                "0",
                "1920",
                "1080",
            )
        )

        return cursor
    }

    private fun buildDeepLink(contentId: String, contentType: String): String =
        "bayitplus://play/$contentId?type=$contentType"

    // endregion
}
