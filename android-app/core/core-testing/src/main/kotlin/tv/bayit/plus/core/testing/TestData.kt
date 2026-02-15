package tv.bayit.plus.core.testing

import tv.bayit.plus.core.model.*

/**
 * Test data factory for creating mock objects in tests.
 *
 * Provides convenient factory methods for creating test instances
 * of domain models with sensible defaults.
 */
object TestData {

    /**
     * Creates a test Content object with customizable fields.
     */
    fun createContent(
        id: String = "test-content-id",
        title: String = "Test Movie",
        description: String = "Test description for a great movie",
        poster: String = "https://test.com/poster.jpg",
        type: ContentType = ContentType.MOVIE,
        rating: Double = 8.5,
        year: Int = 2024,
        duration: Int? = 7200,
        genres: List<String> = listOf("Action", "Drama")
    ) = Content(
        id = id,
        title = title,
        description = description,
        poster = poster,
        type = type,
        rating = rating,
        year = year,
        duration = duration,
        genres = genres
    )

    /**
     * Creates a test User object.
     */
    fun createUser(
        id: String = "test-user-id",
        email: String = "test@bayit.tv",
        displayName: String = "Test User",
        photoUrl: String? = null
    ) = UserModels.User(
        id = id,
        email = email,
        displayName = displayName,
        photoUrl = photoUrl
    )

    /**
     * Creates a test LiveTV channel.
     */
    fun createLiveTVChannel(
        id: String = "test-channel-id",
        name: String = "Test Channel",
        logo: String = "https://test.com/logo.jpg",
        streamUrl: String = "https://test.com/stream.m3u8",
        category: String = "General"
    ) = LiveTVModels.Channel(
        id = id,
        name = name,
        logo = logo,
        streamUrl = streamUrl,
        category = category
    )

    /**
     * Creates a test Podcast.
     */
    fun createPodcast(
        id: String = "test-podcast-id",
        title: String = "Test Podcast",
        description: String = "Test podcast description",
        cover: String = "https://test.com/podcast.jpg",
        author: String = "Test Author"
    ) = PodcastModels.Podcast(
        id = id,
        title = title,
        description = description,
        cover = cover,
        author = author
    )

    /**
     * Creates a test Podcast Episode.
     */
    fun createPodcastEpisode(
        id: String = "test-episode-id",
        podcastId: String = "test-podcast-id",
        title: String = "Test Episode",
        description: String = "Test episode description",
        audioUrl: String = "https://test.com/episode.mp3",
        duration: Int = 3600,
        publishDate: String = "2024-01-01"
    ) = PodcastModels.Episode(
        id = id,
        podcastId = podcastId,
        title = title,
        description = description,
        audioUrl = audioUrl,
        duration = duration,
        publishDate = publishDate
    )

    /**
     * Creates a test Audiobook.
     */
    fun createAudiobook(
        id: String = "test-audiobook-id",
        title: String = "Test Audiobook",
        author: String = "Test Author",
        narrator: String = "Test Narrator",
        cover: String = "https://test.com/audiobook.jpg",
        duration: Int = 36000
    ) = AudiobookModels.Audiobook(
        id = id,
        title = title,
        author = author,
        narrator = narrator,
        cover = cover,
        duration = duration
    )

    /**
     * Creates a test Radio station.
     */
    fun createRadioStation(
        id: String = "test-radio-id",
        name: String = "Test Radio",
        logo: String = "https://test.com/radio.jpg",
        streamUrl: String = "https://test.com/radio.m3u8",
        genre: String = "News"
    ) = RadioModels.Station(
        id = id,
        name = name,
        logo = logo,
        streamUrl = streamUrl,
        genre = genre
    )

    /**
     * Creates a test Series.
     */
    fun createSeries(
        id: String = "test-series-id",
        title: String = "Test Series",
        description: String = "Test series description",
        poster: String = "https://test.com/series.jpg",
        rating: Double = 9.0,
        year: Int = 2024,
        seasons: Int = 2
    ) = SeriesModels.Series(
        id = id,
        title = title,
        description = description,
        poster = poster,
        rating = rating,
        year = year,
        seasons = seasons
    )

    /**
     * Creates a test Episode.
     */
    fun createEpisode(
        id: String = "test-episode-id",
        seriesId: String = "test-series-id",
        seasonNumber: Int = 1,
        episodeNumber: Int = 1,
        title: String = "Test Episode",
        description: String = "Test episode description",
        duration: Int = 2700
    ) = SeriesModels.Episode(
        id = id,
        seriesId = seriesId,
        seasonNumber = seasonNumber,
        episodeNumber = episodeNumber,
        title = title,
        description = description,
        duration = duration
    )

    /**
     * Creates a list of test content items.
     */
    fun createContentList(count: Int = 5): List<Content> {
        return (1..count).map { index ->
            createContent(
                id = "test-content-$index",
                title = "Test Content $index"
            )
        }
    }
}
