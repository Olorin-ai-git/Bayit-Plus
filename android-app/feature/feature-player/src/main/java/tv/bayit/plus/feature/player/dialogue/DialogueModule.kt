package tv.bayit.plus.feature.player.dialogue

import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import tv.bayit.plus.core.network.api.BayitApiClient
import javax.inject.Singleton

/**
 * Hilt module for character dialogue feature dependencies.
 *
 * Provides the [VODInteractionApi] Retrofit interface created through
 * [BayitApiClient], which handles base URL configuration, auth headers,
 * retry logic, and kotlinx.serialization decoding.
 */
@Module
@InstallIn(SingletonComponent::class)
object DialogueModule {

    @Provides
    @Singleton
    fun provideVODInteractionApi(client: BayitApiClient): VODInteractionApi =
        client.createService()
}
