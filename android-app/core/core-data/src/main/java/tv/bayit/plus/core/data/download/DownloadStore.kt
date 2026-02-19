package tv.bayit.plus.core.data.download

import android.content.Context
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import tv.bayit.plus.core.model.LocalDownload
import java.io.File
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Thread-safe JSON file persistence for local downloads.
 * Mirrors the iOS DownloadStore actor pattern using [Mutex].
 */
@Singleton
class DownloadStore @Inject constructor(
    @ApplicationContext private val context: Context,
    private val json: Json,
) {
    private val mutex = Mutex()
    private var cache: MutableList<LocalDownload>? = null

    private val file: File
        get() = File(context.filesDir, STORE_FILE_NAME)

    suspend fun load(): List<LocalDownload> = mutex.withLock {
        cache?.toList() ?: run {
            val loaded = readFromDisk()
            cache = loaded.toMutableList()
            loaded
        }
    }

    suspend fun upsert(download: LocalDownload) = mutex.withLock {
        val list = ensureCache()
        val index = list.indexOfFirst { it.id == download.id }
        if (index >= 0) {
            list[index] = download
        } else {
            list.add(download)
        }
        writeToDisk(list)
    }

    suspend fun remove(id: String) = mutex.withLock {
        val list = ensureCache()
        list.removeAll { it.id == id }
        writeToDisk(list)
    }

    suspend fun clear() = mutex.withLock {
        val list = ensureCache()
        list.clear()
        writeToDisk(list)
    }

    private fun ensureCache(): MutableList<LocalDownload> {
        return cache ?: run {
            val loaded = readFromDisk().toMutableList()
            cache = loaded
            loaded
        }
    }

    private fun readFromDisk(): List<LocalDownload> = try {
        val content = file.takeIf { it.exists() }?.readText()
        if (content.isNullOrBlank()) emptyList()
        else json.decodeFromString<List<LocalDownload>>(content)
    } catch (_: Exception) {
        emptyList()
    }

    private fun writeToDisk(downloads: List<LocalDownload>) {
        file.writeText(json.encodeToString(downloads))
    }

    companion object {
        private const val STORE_FILE_NAME = "bayit_downloads.json"
    }
}
