package tv.bayit.plus.di

import android.content.Context
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import tv.bayit.plus.BuildConfig
import tv.bayit.plus.core.common.CastReceiverAppId
import tv.bayit.plus.core.common.CdnBaseUrl
import tv.bayit.plus.core.common.GoogleClientId
import tv.bayit.plus.core.common.GoogleClientSecret
import tv.bayit.plus.core.common.OwnerMode
import tv.bayit.plus.core.common.i18n.BayitStringProvider
import tv.bayit.plus.core.common.i18n.JsonBayitStringProvider
import tv.bayit.plus.core.common.logging.BayitLogger
import tv.bayit.plus.core.network.NetworkConfiguration
import javax.inject.Singleton
import kotlin.time.Duration.Companion.seconds

@Module
@InstallIn(SingletonComponent::class)
object AppModule {

    private const val I18N_PREFS_NAME = "bayit_i18n"


    @Provides
    @Singleton
    @OwnerMode
    fun provideOwnerMode(): Boolean = BuildConfig.OWNER_MODE

    @Provides
    @Singleton
    @CdnBaseUrl
    fun provideCdnBaseUrl(): String = BuildConfig.CDN_BASE_URL

    @Provides
    @Singleton
    @CastReceiverAppId
    fun provideCastReceiverAppId(): String = BuildConfig.CAST_RECEIVER_APP_ID

    @Provides
    @Singleton
    @GoogleClientId
    fun provideGoogleClientId(): String = BuildConfig.GOOGLE_CLIENT_ID

    @Provides
    @Singleton
    @GoogleClientSecret
    fun provideGoogleClientSecret(): String = BuildConfig.GOOGLE_CLIENT_SECRET

    @Provides
    @Singleton
    fun provideNetworkConfiguration(): NetworkConfiguration = NetworkConfiguration(
        baseUrl = BuildConfig.API_BASE_URL,
        webSocketBaseUrl = BuildConfig.WS_BASE_URL,
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

    @Provides
    @Singleton
    fun provideBayitStringProvider(
        @ApplicationContext context: Context,
        logger: BayitLogger,
    ): BayitStringProvider = JsonBayitStringProvider(
        context = context,
        logger = logger,
        prefs = context.getSharedPreferences(I18N_PREFS_NAME, Context.MODE_PRIVATE),
    )
}
