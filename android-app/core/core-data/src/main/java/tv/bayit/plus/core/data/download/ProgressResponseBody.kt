package tv.bayit.plus.core.data.download

import okhttp3.MediaType
import okhttp3.ResponseBody
import okio.Buffer
import okio.BufferedSource
import okio.ForwardingSource
import okio.Source
import okio.buffer

/**
 * OkHttp [ResponseBody] wrapper that intercepts reads to track download progress.
 * Reports progress as a float between 0.0 and 1.0 via the [onProgress] callback.
 */
class ProgressResponseBody(
    private val delegate: ResponseBody,
    private val onProgress: (Float) -> Unit,
) : ResponseBody() {

    private var bufferedSource: BufferedSource? = null

    override fun contentType(): MediaType? = delegate.contentType()

    override fun contentLength(): Long = delegate.contentLength()

    override fun source(): BufferedSource {
        return bufferedSource ?: createProgressSource(delegate.source()).buffer().also {
            bufferedSource = it
        }
    }

    private fun createProgressSource(source: Source): Source {
        val totalBytes = delegate.contentLength()
        var bytesRead = 0L

        return object : ForwardingSource(source) {
            override fun read(sink: Buffer, byteCount: Long): Long {
                val read = super.read(sink, byteCount)
                if (read != -1L) {
                    bytesRead += read
                    if (totalBytes > 0) {
                        onProgress(bytesRead.toFloat() / totalBytes.toFloat())
                    }
                }
                return read
            }
        }
    }
}
