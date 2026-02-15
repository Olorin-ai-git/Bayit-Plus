package tv.bayit.plus.feature.zehani.di

import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import tv.bayit.plus.core.data.api.ZehAniApiService
import tv.bayit.plus.core.network.api.BayitApiClient
import javax.inject.Singleton

/**
 * Hilt module for Zeh Ani feature dependencies.
 *
 * Provides the [ZehAniApiService] Retrofit interface. The repository
 * binding is handled in the app-level [RepositoryModule] since the
 * repository interface lives in `core-data`.
 */
@Module
@InstallIn(SingletonComponent::class)
object ZehAniModule {

    @Provides
    @Singleton
    fun provideZehAniApiService(client: BayitApiClient): ZehAniApiService =
        client.createService()
}
