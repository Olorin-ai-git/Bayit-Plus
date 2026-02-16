package tv.bayit.plus.di

import android.content.Context
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import tv.bayit.plus.core.common.logging.BayitLogger
import tv.bayit.plus.core.data.repository.AudiobookRepository
import tv.bayit.plus.core.data.repository.AvatarMeshRepository
import tv.bayit.plus.core.data.repository.AvatarOutfitRepository
import tv.bayit.plus.core.data.repository.BetaCreditsRepository
import tv.bayit.plus.core.data.repository.CategoryRepository
import tv.bayit.plus.core.data.repository.ChatRepository
import tv.bayit.plus.core.data.repository.ChessRepository
import tv.bayit.plus.core.data.repository.ChapterRepository
import tv.bayit.plus.core.data.repository.ContentRepository
import tv.bayit.plus.core.data.repository.CultureRepository
import tv.bayit.plus.core.data.repository.DevicePairingRepository
import tv.bayit.plus.core.data.repository.DirectMessageRepository
import tv.bayit.plus.core.data.repository.DownloadsRepository
import tv.bayit.plus.core.data.repository.EPGRepository
import tv.bayit.plus.core.data.repository.FamilyControlsRepository
import tv.bayit.plus.core.data.repository.FamilySnapRepository
import tv.bayit.plus.core.data.repository.FriendsRepository
import tv.bayit.plus.core.data.repository.GamificationRepository
import tv.bayit.plus.core.data.repository.GrandparentBridgeRepository
import tv.bayit.plus.core.data.repository.HouseholdRepository
import tv.bayit.plus.core.data.repository.InteractiveMissionRepository
import tv.bayit.plus.core.data.repository.LLMSearchRepository
import tv.bayit.plus.core.data.repository.LiveDubbingRepository
import tv.bayit.plus.core.data.repository.LiveTVRepository
import tv.bayit.plus.core.data.repository.MediaRepository
import tv.bayit.plus.core.data.repository.MissionsRepository
import tv.bayit.plus.core.data.repository.NewsRepository
import tv.bayit.plus.core.data.repository.PasskeyRepository
import tv.bayit.plus.core.data.repository.PhoneticMirrorRepository
import tv.bayit.plus.core.data.repository.PlaylistRepository
import tv.bayit.plus.core.data.repository.PodcastRepository
import tv.bayit.plus.core.data.repository.ProfileRepository
import tv.bayit.plus.core.data.repository.RadioRepository
import tv.bayit.plus.core.data.repository.RewardRepository
import tv.bayit.plus.core.data.repository.SearchRepository
import tv.bayit.plus.core.data.repository.SecurityRepository
import tv.bayit.plus.core.data.repository.SeriesRepository
import tv.bayit.plus.core.data.repository.SettingsRepository
import tv.bayit.plus.core.data.repository.ShabbatRepository
import tv.bayit.plus.core.data.repository.StarStoryRepository
import tv.bayit.plus.core.data.repository.StatsRepository
import tv.bayit.plus.core.data.repository.SubtitleRepository
import tv.bayit.plus.core.data.repository.TalkBackRepository
import tv.bayit.plus.core.data.repository.TrendingRepository
import tv.bayit.plus.core.data.repository.TriviaRepository
import tv.bayit.plus.core.data.repository.UserRepository
import tv.bayit.plus.core.data.repository.VoiceRepository
import tv.bayit.plus.core.data.repository.WatchPartyRepository
import tv.bayit.plus.core.data.repository.WidgetRepository
import tv.bayit.plus.core.data.repository.ZehAniRepository
import tv.bayit.plus.core.data.repository.impl.ApiAudiobookRepository
import tv.bayit.plus.core.data.repository.impl.ApiAvatarMeshRepository
import tv.bayit.plus.core.data.repository.impl.ApiAvatarOutfitRepository
import tv.bayit.plus.core.data.repository.impl.ApiBetaCreditsRepository
import tv.bayit.plus.core.data.repository.impl.ApiCategoryRepository
import tv.bayit.plus.core.data.repository.impl.ApiChapterRepository
import tv.bayit.plus.core.data.repository.impl.ApiChatRepository
import tv.bayit.plus.core.data.repository.impl.ApiChessRepository
import tv.bayit.plus.core.data.repository.impl.ApiContentRepository
import tv.bayit.plus.core.data.repository.impl.ApiCultureRepository
import tv.bayit.plus.core.data.repository.impl.ApiDevicePairingRepository
import tv.bayit.plus.core.data.repository.impl.ApiDirectMessageRepository
import tv.bayit.plus.core.data.repository.impl.ApiDownloadsRepository
import tv.bayit.plus.core.data.repository.impl.ApiEPGRepository
import tv.bayit.plus.core.data.repository.impl.ApiFamilyControlsRepository
import tv.bayit.plus.core.data.repository.impl.ApiFamilySnapRepository
import tv.bayit.plus.core.data.repository.impl.ApiFriendsRepository
import tv.bayit.plus.core.data.repository.impl.ApiGamificationRepository
import tv.bayit.plus.core.data.repository.impl.ApiGrandparentBridgeRepository
import tv.bayit.plus.core.data.repository.impl.ApiHouseholdRepository
import tv.bayit.plus.core.data.repository.impl.ApiInteractiveMissionRepository
import tv.bayit.plus.core.data.repository.impl.ApiLiveDubbingRepository
import tv.bayit.plus.core.data.repository.impl.ApiLiveTVRepository
import tv.bayit.plus.core.data.repository.impl.ApiLLMSearchRepository
import tv.bayit.plus.core.data.repository.impl.ApiMediaRepository
import tv.bayit.plus.core.data.repository.impl.ApiMissionsRepository
import tv.bayit.plus.core.data.repository.impl.ApiNewsRepository
import tv.bayit.plus.core.data.repository.impl.ApiPasskeyRepository
import tv.bayit.plus.core.data.repository.impl.ApiPhoneticMirrorRepository
import tv.bayit.plus.core.data.repository.impl.ApiPlaylistRepository
import tv.bayit.plus.core.data.repository.impl.ApiPodcastRepository
import tv.bayit.plus.core.data.repository.impl.ApiProfileRepository
import tv.bayit.plus.core.data.repository.impl.ApiRadioRepository
import tv.bayit.plus.core.data.repository.impl.ApiRewardRepository
import tv.bayit.plus.core.data.repository.impl.ApiSearchRepository
import tv.bayit.plus.core.data.repository.impl.ApiSecurityRepository
import tv.bayit.plus.core.data.repository.impl.ApiSeriesRepository
import tv.bayit.plus.core.data.repository.impl.ApiSettingsRepository
import tv.bayit.plus.core.data.repository.impl.ApiShabbatRepository
import tv.bayit.plus.core.data.repository.impl.ApiStarStoryRepository
import tv.bayit.plus.core.data.repository.impl.ApiStatsRepository
import tv.bayit.plus.core.data.repository.impl.ApiSubtitleRepository
import tv.bayit.plus.core.data.repository.impl.ApiTalkBackRepository
import tv.bayit.plus.core.data.repository.impl.ApiTrendingRepository
import tv.bayit.plus.core.data.repository.impl.ApiTriviaRepository
import tv.bayit.plus.core.data.repository.impl.ApiUserRepository
import tv.bayit.plus.core.data.repository.impl.ApiVoiceRepository
import tv.bayit.plus.core.data.repository.impl.ApiWatchPartyRepository
import tv.bayit.plus.core.data.repository.impl.ApiWidgetRepository
import tv.bayit.plus.core.data.repository.impl.ApiZehAniRepository
import tv.bayit.plus.core.network.BayitApiClient
import tv.bayit.plus.core.network.websocket.WebSocketManager
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object RepositoryModule {

    @Provides
    @Singleton
    fun provideContentRepository(client: BayitApiClient): ContentRepository =
        ApiContentRepository(client)

    @Provides
    @Singleton
    fun provideLiveTVRepository(client: BayitApiClient): LiveTVRepository =
        ApiLiveTVRepository(client)

    @Provides
    @Singleton
    fun provideRadioRepository(client: BayitApiClient): RadioRepository =
        ApiRadioRepository(client)

    @Provides
    @Singleton
    fun providePodcastRepository(client: BayitApiClient): PodcastRepository =
        ApiPodcastRepository(client)

    @Provides
    @Singleton
    fun provideSeriesRepository(client: BayitApiClient): SeriesRepository =
        ApiSeriesRepository(client)

    @Provides
    @Singleton
    fun provideMediaRepository(client: BayitApiClient): MediaRepository =
        ApiMediaRepository(client)

    @Provides
    @Singleton
    fun provideUserRepository(client: BayitApiClient): UserRepository =
        ApiUserRepository(client)

    @Provides
    @Singleton
    fun provideProfileRepository(client: BayitApiClient): ProfileRepository =
        ApiProfileRepository(client)

    @Provides
    @Singleton
    fun providePlaylistRepository(client: BayitApiClient): PlaylistRepository =
        ApiPlaylistRepository(client)

    @Provides
    @Singleton
    fun provideEPGRepository(client: BayitApiClient): EPGRepository =
        ApiEPGRepository(client)

    @Provides
    @Singleton
    fun provideCategoryRepository(client: BayitApiClient): CategoryRepository =
        ApiCategoryRepository(client)

    @Provides
    @Singleton
    fun provideVoiceRepository(
        client: BayitApiClient,
        @ApplicationContext context: Context,
        logger: BayitLogger,
    ): VoiceRepository =
        ApiVoiceRepository(client, context, logger)

    @Provides
    @Singleton
    fun provideSettingsRepository(client: BayitApiClient): SettingsRepository =
        ApiSettingsRepository(client)

    @Provides
    @Singleton
    fun provideTriviaRepository(client: BayitApiClient): TriviaRepository =
        ApiTriviaRepository(client)

    @Provides
    @Singleton
    fun provideChatRepository(client: BayitApiClient): ChatRepository =
        ApiChatRepository(client)

    @Provides
    @Singleton
    fun provideLiveDubbingRepository(client: BayitApiClient): LiveDubbingRepository =
        ApiLiveDubbingRepository(client)

    @Provides
    @Singleton
    fun provideCultureRepository(client: BayitApiClient): CultureRepository =
        ApiCultureRepository(client)

    @Provides
    @Singleton
    fun provideShabbatRepository(client: BayitApiClient): ShabbatRepository =
        ApiShabbatRepository(client)

    @Provides
    @Singleton
    fun provideFamilyControlsRepository(client: BayitApiClient): FamilyControlsRepository =
        ApiFamilyControlsRepository(client)

    @Provides
    @Singleton
    fun provideSecurityRepository(client: BayitApiClient): SecurityRepository =
        ApiSecurityRepository(client)

    @Provides
    @Singleton
    fun providePasskeyRepository(client: BayitApiClient): PasskeyRepository =
        ApiPasskeyRepository(client)

    @Provides
    @Singleton
    fun provideBetaCreditsRepository(client: BayitApiClient): BetaCreditsRepository =
        ApiBetaCreditsRepository(client)

    @Provides
    @Singleton
    fun provideSubtitleRepository(client: BayitApiClient): SubtitleRepository =
        ApiSubtitleRepository(client)

    @Provides
    @Singleton
    fun provideChapterRepository(client: BayitApiClient): ChapterRepository =
        ApiChapterRepository(client)

    @Provides
    @Singleton
    fun provideAudiobookRepository(client: BayitApiClient): AudiobookRepository =
        ApiAudiobookRepository(client)

    @Provides
    @Singleton
    fun provideTrendingRepository(client: BayitApiClient): TrendingRepository =
        ApiTrendingRepository(client)

    @Provides
    @Singleton
    fun provideLLMSearchRepository(client: BayitApiClient): LLMSearchRepository =
        ApiLLMSearchRepository(client)

    @Provides
    @Singleton
    fun provideHouseholdRepository(client: BayitApiClient): HouseholdRepository =
        ApiHouseholdRepository(client)

    @Provides
    @Singleton
    fun provideRewardRepository(client: BayitApiClient): RewardRepository =
        ApiRewardRepository(client)

    @Provides
    @Singleton
    fun provideDevicePairingRepository(client: BayitApiClient): DevicePairingRepository =
        ApiDevicePairingRepository(client)

    @Provides
    @Singleton
    fun provideDownloadsRepository(client: BayitApiClient): DownloadsRepository =
        ApiDownloadsRepository(client)

    @Provides
    @Singleton
    fun provideWidgetRepository(client: BayitApiClient): WidgetRepository =
        ApiWidgetRepository(client)

    @Provides
    @Singleton
    fun provideFriendsRepository(client: BayitApiClient): FriendsRepository =
        ApiFriendsRepository(client)

    @Provides
    @Singleton
    fun provideWatchPartyRepository(client: BayitApiClient): WatchPartyRepository =
        ApiWatchPartyRepository(client)

    @Provides
    @Singleton
    fun provideChessRepository(
        client: BayitApiClient,
        webSocketManager: WebSocketManager,
    ): ChessRepository = ApiChessRepository(client, webSocketManager)

    @Provides
    @Singleton
    fun provideDirectMessageRepository(
        client: BayitApiClient,
        webSocketManager: WebSocketManager,
    ): DirectMessageRepository = ApiDirectMessageRepository(client, webSocketManager)

    @Provides
    @Singleton
    fun provideStatsRepository(client: BayitApiClient): StatsRepository =
        ApiStatsRepository(client)

    @Provides
    @Singleton
    fun provideNewsRepository(client: BayitApiClient): NewsRepository =
        ApiNewsRepository(client)

    @Provides
    @Singleton
    fun provideSearchRepository(client: BayitApiClient): SearchRepository =
        ApiSearchRepository(client)

    @Provides
    @Singleton
    fun provideMissionsRepository(client: BayitApiClient): MissionsRepository =
        ApiMissionsRepository(client)

    @Provides
    @Singleton
    fun provideStarStoryRepository(client: BayitApiClient): StarStoryRepository =
        ApiStarStoryRepository(client)

    @Provides
    @Singleton
    fun provideInteractiveMissionRepository(client: BayitApiClient): InteractiveMissionRepository =
        ApiInteractiveMissionRepository(client)

    @Provides
    @Singleton
    fun provideAvatarOutfitRepository(client: BayitApiClient): AvatarOutfitRepository =
        ApiAvatarOutfitRepository(client)

    @Provides
    @Singleton
    fun provideFamilySnapRepository(client: BayitApiClient): FamilySnapRepository =
        ApiFamilySnapRepository(client)

    @Provides
    @Singleton
    fun providePhoneticMirrorRepository(client: BayitApiClient): PhoneticMirrorRepository =
        ApiPhoneticMirrorRepository(client)

    @Provides
    @Singleton
    fun provideGrandparentBridgeRepository(client: BayitApiClient): GrandparentBridgeRepository =
        ApiGrandparentBridgeRepository(client)

    @Provides
    @Singleton
    fun provideGamificationRepository(client: BayitApiClient): GamificationRepository =
        ApiGamificationRepository(client)

    @Provides
    @Singleton
    fun provideAvatarMeshRepository(client: BayitApiClient): AvatarMeshRepository =
        ApiAvatarMeshRepository(client)

    @Provides
    @Singleton
    fun provideTalkBackRepository(client: BayitApiClient): TalkBackRepository =
        ApiTalkBackRepository(client)

    @Provides
    @Singleton
    fun provideZehAniRepository(client: BayitApiClient): ZehAniRepository =
        ApiZehAniRepository(client)
}
