package tv.bayit.plus.core.data.repository

import tv.bayit.plus.core.common.BayitResult

interface ChapterRepository {
    suspend fun getChapters(mediaId: String): BayitResult<List<Any>>
    suspend fun getChapter(mediaId: String, chapterIndex: Int): BayitResult<Any>
    suspend fun skipToChapter(mediaId: String, chapterIndex: Int): BayitResult<Unit>
    suspend fun getChapterThumbnails(mediaId: String): BayitResult<List<Any>>
}
