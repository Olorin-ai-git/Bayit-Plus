package tv.bayit.plus.core.network.di

import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.kotlinx.serialization.asConverterFactory
import tv.bayit.plus.core.common.logging.BayitLogger
import tv.bayit.plus.core.network.NetworkConfiguration
import tv.bayit.plus.core.network.api.BayitApiClient
import tv.bayit.plus.core.network.interceptor.AuthInterceptor
import tv.bayit.plus.core.network.interceptor.CorrelationIdInterceptor
import tv.bayit.plus.core.network.interceptor.LocaleInterceptor
import tv.bayit.plus.core.network.interceptor.RateLimitInterceptor
import tv.bayit.plus.core.network.interceptor.RetryInterceptor
import java.util.concurrent.TimeUnit
import javax.inject.Singleton

/**
 * Hilt module providing OkHttpClient, Retrofit, kotlinx.serialization Json,
 * and the [BayitApiClient].
 *
 * Interceptor order (matching iOS APIClient header injection order):
 * 1. Auth       -- injects Bearer token (+ 401 refresh)
 * 2. Correlation -- injects X-Correlation-ID UUID
 * 3. Locale     -- injects Accept-Language from device
 * 4. RateLimit  -- handles 429 with Retry-After
 * 5. Retry      -- exponential backoff for 5xx / network errors
 * 6. Logging    -- HTTP body logging (last, sees final request)
 */
@Module
@InstallIn(SingletonComponent::class)
object NetworkModule {

    @Provides
    @Singleton
    fun provideJson(): Json = Json {
        ignoreUnknownKeys = true
        isLenient = true
        coerceInputValues = true
        encodeDefaults = true
        explicitNulls = false
    }

    @Provides
    @Singleton
    fun provideLoggingInterceptor(): HttpLoggingInterceptor =
        HttpLoggingInterceptor().apply {
            level = HttpLoggingInterceptor.Level.BODY
        }

    @Provides
    @Singleton
    fun provideOkHttpClient(
        authInterceptor: AuthInterceptor,
        correlationIdInterceptor: CorrelationIdInterceptor,
        localeInterceptor: LocaleInterceptor,
        rateLimitInterceptor: RateLimitInterceptor,
        retryInterceptor: RetryInterceptor,
        loggingInterceptor: HttpLoggingInterceptor,
        configuration: NetworkConfiguration,
    ): OkHttpClient = OkHttpClient.Builder()
        .addInterceptor(authInterceptor)
        .addInterceptor(correlationIdInterceptor)
        .addInterceptor(localeInterceptor)
        .addInterceptor(rateLimitInterceptor)
        .addInterceptor(retryInterceptor)
        .addInterceptor(loggingInterceptor)
        .connectTimeout(configuration.timeoutMillis, TimeUnit.MILLISECONDS)
        .readTimeout(configuration.timeoutMillis, TimeUnit.MILLISECONDS)
        .writeTimeout(configuration.timeoutMillis, TimeUnit.MILLISECONDS)
        .pingInterval(configuration.webSocketPingIntervalSeconds, TimeUnit.SECONDS)
        .build()

    @Provides
    @Singleton
    fun provideRetrofit(
        okHttpClient: OkHttpClient,
        json: Json,
        configuration: NetworkConfiguration,
    ): Retrofit = Retrofit.Builder()
        .baseUrl(configuration.baseUrl)
        .client(okHttpClient)
        .addConverterFactory(json.asConverterFactory(JSON_MEDIA_TYPE.toMediaType()))
        .build()

    @Provides
    @Singleton
    fun provideBayitApiClient(
        retrofit: Retrofit,
        okHttpClient: OkHttpClient,
        json: Json,
        logger: BayitLogger,
    ): BayitApiClient = BayitApiClient(retrofit, okHttpClient, json, logger)

    private const val JSON_MEDIA_TYPE = "application/json"
}
