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
object ContentRepositoryModule {

    @Provides @Singleton
    fun provideContentRepository(client: BayitApiClient): ContentRepository = ApiContentRepository(client)

    @Provides @Singleton
    fun provideLiveTVRepository(client: BayitApiClient): LiveTVRepository = ApiLiveTVRepository(client)

    @Provides @Singleton
    fun provideRadioRepository(client: BayitApiClient): RadioRepository = ApiRadioRepository(client)

    @Provides @Singleton
    fun providePodcastRepository(client: BayitApiClient): PodcastRepository = ApiPodcastRepository(client)

    @Provides @Singleton
    fun provideSeriesRepository(client: BayitApiClient): SeriesRepository = ApiSeriesRepository(client)

    @Provides @Singleton
    fun provideMediaRepository(client: BayitApiClient): MediaRepository = ApiMediaRepository(client)

    @Provides @Singleton
    fun provideCategoryRepository(client: BayitApiClient): CategoryRepository = ApiCategoryRepository(client)

    @Provides @Singleton
    fun provideEPGRepository(client: BayitApiClient): EPGRepository = ApiEPGRepository(client)

    @Provides @Singleton
    fun provideCatchupRepository(client: BayitApiClient): CatchupRepository = ApiCatchupRepository(client)

    @Provides @Singleton
    fun provideTrendingRepository(client: BayitApiClient): TrendingRepository = ApiTrendingRepository(client)

    @Provides @Singleton
    fun provideAudiobookRepository(client: BayitApiClient): AudiobookRepository = ApiAudiobookRepository(client)

    @Provides @Singleton
    fun provideSubtitleRepository(client: BayitApiClient): SubtitleRepository = ApiSubtitleRepository(client)

    @Provides @Singleton
    fun provideChapterRepository(client: BayitApiClient): ChapterRepository = ApiChapterRepository(client)

    @Provides @Singleton
    fun provideLiveDubbingRepository(client: BayitApiClient): LiveDubbingRepository = ApiLiveDubbingRepository(client)
}
