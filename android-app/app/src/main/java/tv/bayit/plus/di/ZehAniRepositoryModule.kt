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
object ZehAniRepositoryModule {

    @Provides @Singleton
    fun provideZehAniRepository(client: BayitApiClient): ZehAniRepository = ApiZehAniRepository(client)

    @Provides @Singleton
    fun provideAvatarMeshRepository(client: BayitApiClient): AvatarMeshRepository = ApiAvatarMeshRepository(client)

    @Provides @Singleton
    fun provideAvatarOutfitRepository(client: BayitApiClient): AvatarOutfitRepository = ApiAvatarOutfitRepository(client)

    @Provides @Singleton
    fun providePhoneticMirrorRepository(client: BayitApiClient): PhoneticMirrorRepository = ApiPhoneticMirrorRepository(client)

    @Provides @Singleton
    fun provideFamilySnapRepository(client: BayitApiClient): FamilySnapRepository = ApiFamilySnapRepository(client)

    @Provides @Singleton
    fun provideGamificationRepository(client: BayitApiClient): GamificationRepository = ApiGamificationRepository(client)

    @Provides @Singleton
    fun provideTalkBackRepository(client: BayitApiClient): TalkBackRepository = ApiTalkBackRepository(client)
}
