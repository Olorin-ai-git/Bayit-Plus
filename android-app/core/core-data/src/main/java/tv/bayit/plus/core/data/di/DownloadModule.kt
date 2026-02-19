package tv.bayit.plus.core.data.di

import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import okhttp3.OkHttpClient
import tv.bayit.plus.core.data.download.DownloadClient
import tv.bayit.plus.core.network.NetworkConfiguration
import java.util.concurrent.TimeUnit
import javax.inject.Singleton

/**
 * Hilt module providing download-specific dependencies.
 * The download OkHttpClient has no auth interceptors (downloads use
 * pre-signed or public URLs) and extended read timeouts for large files.
 */
@Module
@InstallIn(SingletonComponent::class)
object DownloadModule {

    @Provides
    @Singleton
    @DownloadClient
    fun provideDownloadOkHttpClient(
        configuration: NetworkConfiguration,
    ): OkHttpClient = OkHttpClient.Builder()
        .connectTimeout(configuration.timeoutMillis, TimeUnit.MILLISECONDS)
        .readTimeout(DOWNLOAD_READ_TIMEOUT_MS, TimeUnit.MILLISECONDS)
        .writeTimeout(configuration.timeoutMillis, TimeUnit.MILLISECONDS)
        .build()

    private const val DOWNLOAD_READ_TIMEOUT_MS = 300_000L
}
