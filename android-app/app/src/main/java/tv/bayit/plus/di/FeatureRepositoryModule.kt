package tv.bayit.plus.di

import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import tv.bayit.plus.core.data.repository.*
import tv.bayit.plus.core.data.repository.impl.*
import tv.bayit.plus.core.network.BayitApiClient
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object FeatureRepositoryModule {

    @Provides @Singleton
    fun provideCultureRepository(client: BayitApiClient): CultureRepository = ApiCultureRepository(client)

    @Provides @Singleton
    fun provideShabbatRepository(client: BayitApiClient): ShabbatRepository = ApiShabbatRepository(client)

    @Provides @Singleton
    fun provideFamilyControlsRepository(client: BayitApiClient): FamilyControlsRepository = ApiFamilyControlsRepository(client)

    @Provides @Singleton
    fun provideHouseholdRepository(client: BayitApiClient): HouseholdRepository = ApiHouseholdRepository(client)

    @Provides @Singleton
    fun provideTriviaRepository(client: BayitApiClient): TriviaRepository = ApiTriviaRepository(client)

    @Provides @Singleton
    fun providePlaylistRepository(client: BayitApiClient): PlaylistRepository = ApiPlaylistRepository(client)

    @Provides @Singleton
    fun provideRewardRepository(client: BayitApiClient): RewardRepository = ApiRewardRepository(client)

    @Provides @Singleton
    fun provideMissionsRepository(client: BayitApiClient): MissionsRepository = ApiMissionsRepository(client)

    @Provides @Singleton
    fun provideStarStoryRepository(client: BayitApiClient): StarStoryRepository = ApiStarStoryRepository(client)

    @Provides @Singleton
    fun provideInteractiveMissionRepository(client: BayitApiClient): InteractiveMissionRepository = ApiInteractiveMissionRepository(client)

    @Provides @Singleton
    fun provideLocationRepository(client: BayitApiClient): LocationRepository = ApiLocationRepository(client)

    @Provides @Singleton
    fun provideDownloadsRepository(client: BayitApiClient): DownloadsRepository = ApiDownloadsRepository(client)

    @Provides @Singleton
    fun provideWidgetRepository(client: BayitApiClient): WidgetRepository = ApiWidgetRepository(client)

    @Provides @Singleton
    fun provideProactiveVoiceRepository(client: BayitApiClient): ProactiveVoiceRepository =
        ApiProactiveVoiceRepository(client)
}
