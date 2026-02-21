package tv.bayit.plus.di

import dagger.Binds
import dagger.Module
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import tv.bayit.plus.core.common.ConnectivityNetworkMonitor
import tv.bayit.plus.core.common.NetworkMonitor
import tv.bayit.plus.core.network.NetworkConfig
import tv.bayit.plus.core.network.NetworkConfiguration

@Module
@InstallIn(SingletonComponent::class)
abstract class AppBindingsModule {

    @Binds
    abstract fun bindNetworkMonitor(
        impl: ConnectivityNetworkMonitor,
    ): NetworkMonitor

    @Binds
    abstract fun bindNetworkConfig(
        impl: NetworkConfiguration,
    ): NetworkConfig
}
