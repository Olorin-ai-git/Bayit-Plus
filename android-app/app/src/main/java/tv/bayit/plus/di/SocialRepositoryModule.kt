package tv.bayit.plus.di

import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import tv.bayit.plus.core.data.repository.*
import tv.bayit.plus.core.data.repository.impl.*
import tv.bayit.plus.core.network.BayitApiClient
import tv.bayit.plus.core.network.websocket.WebSocketManager
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object SocialRepositoryModule {

    @Provides @Singleton
    fun provideFriendsRepository(client: BayitApiClient): FriendsRepository = ApiFriendsRepository(client)

    @Provides @Singleton
    fun provideWatchPartyRepository(client: BayitApiClient): WatchPartyRepository = ApiWatchPartyRepository(client)

    @Provides @Singleton
    fun provideChessRepository(
        client: BayitApiClient,
    ): ChessRepository = ApiChessRepository(client)

    @Provides @Singleton
    fun provideDirectMessageRepository(
        client: BayitApiClient,
        webSocketManager: WebSocketManager,
    ): DirectMessageRepository = ApiDirectMessageRepository(client, webSocketManager)

    @Provides @Singleton
    fun provideChatRepository(client: BayitApiClient): ChatRepository = ApiChatRepository(client)

    @Provides @Singleton
    fun provideGrandparentBridgeRepository(client: BayitApiClient): GrandparentBridgeRepository = ApiGrandparentBridgeRepository(client)

    @Provides @Singleton
    fun provideStatsRepository(client: BayitApiClient): StatsRepository = ApiStatsRepository(client)

    @Provides @Singleton
    fun provideNewsRepository(client: BayitApiClient): NewsRepository = ApiNewsRepository(client)

    @Provides @Singleton
    fun provideSearchRepository(client: BayitApiClient): SearchRepository = ApiSearchRepository(client)

    @Provides @Singleton
    fun provideLLMSearchRepository(client: BayitApiClient): LLMSearchRepository = ApiLLMSearchRepository(client)
}
