package tv.bayit.plus.core.data.download

import javax.inject.Qualifier

/** Qualifier for the plain OkHttpClient used for file downloads (no auth interceptors). */
@Qualifier
@Retention(AnnotationRetention.BINARY)
annotation class DownloadClient
