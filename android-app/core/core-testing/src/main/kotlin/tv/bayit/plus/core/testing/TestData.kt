package tv.bayit.plus.core.testing

import tv.bayit.plus.core.model.*

/**
 * Test data factory for creating model instances in tests.
 *
 * Provides convenient factory methods for creating test instances
 * of domain models with sensible defaults.
 */
object TestData {

    /**
     * Creates a test ContentItem.
     */
    fun createContentItem(
        id: String = "test-content-id",
        title: String = "Test Movie",
        description: String = "Test description for a great movie",
        thumbnail: String = "https://test.com/poster.jpg",
        type: String = "movie",
        year: Int = 2024,
        duration: String = "120",
        category: String = "Action",
    ) = ContentItem(
        id = id,
        title = title,
        description = description,
        thumbnail = thumbnail,
        type = type,
        year = year,
        duration = duration,
        category = category,
    )

    /**
     * Creates a test UserResponse.
     */
    fun createUser(
        id: String = "test-user-id",
        email: String = "test@bayit.tv",
        name: String = "Test User",
        avatar: String? = null,
    ) = UserResponse(
        id = id,
        email = email,
        name = name,
        avatar = avatar,
    )

    /**
     * Creates a test LiveChannelItem.
     */
    fun createLiveTVChannel(
        id: String = "test-channel-id",
        name: String = "Test Channel",
        logo: String = "https://test.com/logo.jpg",
        category: String = "General",
    ) = LiveChannelItem(
        id = id,
        name = name,
        logo = logo,
        category = category,
    )

    /**
     * Creates a test PodcastShow.
     */
    fun createPodcastShow(
        id: String = "test-podcast-id",
        title: String = "Test Podcast",
        cover: String = "https://test.com/podcast.jpg",
        author: String = "Test Author",
        category: String = "Technology",
    ) = PodcastShow(
        id = id,
        title = title,
        cover = cover,
        author = author,
        category = category,
    )

    /**
     * Creates a test PodcastEpisodeItem.
     */
    fun createPodcastEpisode(
        id: String = "test-episode-id",
        title: String = "Test Episode",
        description: String = "Test episode description",
        audioUrl: String = "https://test.com/episode.mp3",
        duration: String = "3600",
        episodeNumber: Int = 1,
        publishedAt: String = "2024-01-01",
    ) = PodcastEpisodeItem(
        id = id,
        title = title,
        description = description,
        audioUrl = audioUrl,
        duration = duration,
        episodeNumber = episodeNumber,
        publishedAt = publishedAt,
    )

    /**
     * Creates a test Audiobook.
     */
    fun createAudiobook(
        id: String = "test-audiobook-id",
        title: String = "Test Audiobook",
        author: String = "Test Author",
        narrator: String = "Test Narrator",
        thumbnail: String = "https://test.com/audiobook.jpg",
        duration: String = "36000",
    ) = Audiobook(
        id = id,
        title = title,
        author = author,
        narrator = narrator,
        thumbnail = thumbnail,
        duration = duration,
    )

    /**
     * Creates a test RadioStationItem.
     */
    fun createRadioStation(
        id: String = "test-radio-id",
        name: String = "Test Radio",
        logo: String = "https://test.com/radio.jpg",
        genre: String = "News",
    ) = RadioStationItem(
        id = id,
        name = name,
        logo = logo,
        genre = genre,
    )

    /**
     * Creates a test SeriesDetail.
     */
    fun createSeries(
        id: String = "test-series-id",
        title: String = "Test Series",
        description: String = "Test series description",
        thumbnail: String = "https://test.com/series.jpg",
        year: Int = 2024,
        totalSeasons: Int = 2,
        totalEpisodes: Int = 20,
    ) = SeriesDetail(
        id = id,
        title = title,
        description = description,
        thumbnail = thumbnail,
        year = year,
        totalSeasons = totalSeasons,
        totalEpisodes = totalEpisodes,
    )

    /**
     * Creates a test EpisodeItem.
     */
    fun createEpisode(
        id: String = "test-episode-id",
        title: String = "Test Episode",
        description: String = "Test episode description",
        episodeNumber: Int = 1,
        duration: String = "2700",
    ) = EpisodeItem(
        id = id,
        title = title,
        description = description,
        episodeNumber = episodeNumber,
        duration = duration,
    )

    /**
     * Creates a list of test content items.
     */
    fun createContentList(count: Int = 5): List<ContentItem> {
        return (1..count).map { index ->
            createContentItem(
                id = "test-content-$index",
                title = "Test Content $index",
            )
        }
    }
}
