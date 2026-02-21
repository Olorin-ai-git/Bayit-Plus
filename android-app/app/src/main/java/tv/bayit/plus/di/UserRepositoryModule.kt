package tv.bayit.plus.di

import android.content.Context
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import tv.bayit.plus.core.common.logging.BayitLogger
import tv.bayit.plus.core.data.repository.*
import tv.bayit.plus.core.data.repository.impl.*
import tv.bayit.plus.core.network.BayitApiClient
import tv.bayit.plus.core.voice.VoiceApiService
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object UserRepositoryModule {

    @Provides @Singleton
    fun provideUserRepository(client: BayitApiClient): UserRepository = ApiUserRepository(client)

    @Provides @Singleton
    fun provideProfileRepository(client: BayitApiClient): ProfileRepository = ApiProfileRepository(client)

    @Provides @Singleton
    fun provideSettingsRepository(client: BayitApiClient): SettingsRepository = ApiSettingsRepository(client)

    @Provides @Singleton
    fun provideSecurityRepository(client: BayitApiClient): SecurityRepository = ApiSecurityRepository(client)

    @Provides @Singleton
    fun providePasskeyRepository(client: BayitApiClient): PasskeyRepository = ApiPasskeyRepository(client)

    @Provides @Singleton
    fun provideDevicePairingRepository(client: BayitApiClient): DevicePairingRepository = ApiDevicePairingRepository(client)

    @Provides @Singleton
    fun provideBetaCreditsRepository(client: BayitApiClient): BetaCreditsRepository = ApiBetaCreditsRepository(client)

    @Provides @Singleton
    fun provideVoiceRepository(
        client: BayitApiClient,
        @ApplicationContext context: Context,
        logger: BayitLogger,
    ): VoiceRepository = ApiVoiceRepository(client, context, logger)

    @Provides @Singleton
    fun provideVoiceApiService(client: BayitApiClient): VoiceApiService = client.createService()
}
