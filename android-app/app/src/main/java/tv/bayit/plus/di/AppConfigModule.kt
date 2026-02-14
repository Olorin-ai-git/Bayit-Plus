package tv.bayit.plus.di

import dagger.Binds
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import tv.bayit.plus.BuildConfig
import tv.bayit.plus.core.common.ConnectivityNetworkMonitor
import tv.bayit.plus.core.common.NetworkMonitor
import tv.bayit.plus.core.network.NetworkConfig
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object AppConfigModule {

    @Provides
    @Singleton
    fun provideNetworkConfig(): NetworkConfig = object : NetworkConfig {
        override val baseUrl: String
            get() = BuildConfig.API_BASE_URL
        override val webSocketBaseUrl: String
            get() = BuildConfig.WS_BASE_URL
        override val timeout: Long = 30_000L
        override val maxRetries: Int = 3
        override val retryBaseDelay: Long = 1_000L
        override val webSocketPingInterval: Long = 30_000L
        override val webSocketMaxConnections: Int = 8
    }
}

@Module
@InstallIn(SingletonComponent::class)
abstract class AppBindingsModule {

    @Binds
    abstract fun bindNetworkMonitor(
        impl: ConnectivityNetworkMonitor,
    ): NetworkMonitor
}
