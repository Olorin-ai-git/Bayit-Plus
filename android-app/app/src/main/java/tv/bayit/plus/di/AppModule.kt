package tv.bayit.plus.di

import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import tv.bayit.plus.BuildConfig
import tv.bayit.plus.core.network.NetworkConfiguration
import javax.inject.Singleton
import kotlin.time.Duration.Companion.seconds

/**
 * Application-level Hilt module providing app-wide dependencies.
 */
@Module
@InstallIn(SingletonComponent::class)
object AppModule {

    @Provides
    @Singleton
    fun provideNetworkConfiguration(): NetworkConfiguration = NetworkConfiguration(
        baseUrl = "https://api.bayit.tv",
        webSocketBaseUrl = "wss://api.bayit.tv/ws",
        timeoutDuration = 30.seconds,
        maxRetries = 3,
        retryBaseDelayDuration = 1.seconds,
        retryableStatusCodes = setOf(408, 429, 500, 502, 503, 504),
        webSocketMaxConnections = 5,
        webSocketPingIntervalDuration = 30.seconds,
        webSocketMaxReconnectAttempts = 5,
        webSocketReconnectBaseDelay = 1.seconds,
        isDebug = BuildConfig.DEBUG,
    )
}
