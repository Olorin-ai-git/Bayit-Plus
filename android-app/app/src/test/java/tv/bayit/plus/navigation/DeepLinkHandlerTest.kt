package tv.bayit.plus.navigation

import android.net.Uri
import com.google.common.truth.Truth.assertThat
import io.mockk.every
import io.mockk.mockk
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import tv.bayit.plus.core.common.logging.NoOpBayitLogger

/**
 * Unit tests for [DeepLinkHandler].
 *
 * Validates: custom-scheme routing, universal-link routing,
 * unrecognised URIs, and query-parameter extraction.
 */
class DeepLinkHandlerTest {

    private lateinit var handler: DeepLinkHandler

    @BeforeEach
    fun setup() {
        handler = DeepLinkHandler(NoOpBayitLogger())
    }

    // --- Custom scheme ---

    @Test
    fun `custom scheme player - routes to Player with type from query`() {
        val uri = Uri.parse("bayitplus://player/abc123?type=series")
        val result = handler.parseUri(uri)
        assertThat(result).isEqualTo(Route.Player("abc123", "series"))
    }

    @Test
    fun `custom scheme player - defaults type to movie when no query param`() {
        val uri = Uri.parse("bayitplus://player/xyz")
        val result = handler.parseUri(uri)
        assertThat(result).isEqualTo(Route.Player("xyz", "movie"))
    }

    @Test
    fun `custom scheme player - returns null when no segment`() {
        val uri = buildUri("bayitplus", "player", emptyList())
        val result = handler.parseUri(uri)
        assertThat(result).isNull()
    }

    @Test
    fun `custom scheme movie - routes to MovieDetail`() {
        val uri = Uri.parse("bayitplus://movie/m-42")
        val result = handler.parseUri(uri)
        assertThat(result).isEqualTo(Route.MovieDetail("m-42"))
    }

    @Test
    fun `custom scheme series - routes to SeriesDetail`() {
        val uri = Uri.parse("bayitplus://series/s-99")
        val result = handler.parseUri(uri)
        assertThat(result).isEqualTo(Route.SeriesDetail("s-99"))
    }

    @Test
    fun `custom scheme livetv - routes to LiveTV`() {
        val uri = Uri.parse("bayitplus://livetv")
        assertThat(handler.parseUri(uri)).isEqualTo(Route.LiveTV)
    }

    @Test
    fun `custom scheme radio - routes to Radio`() {
        assertThat(handler.parseUri(Uri.parse("bayitplus://radio"))).isEqualTo(Route.Radio)
    }

    @Test
    fun `custom scheme search - routes to Search`() {
        assertThat(handler.parseUri(Uri.parse("bayitplus://search"))).isEqualTo(Route.Search)
    }

    @Test
    fun `custom scheme profile - routes to Profile`() {
        assertThat(handler.parseUri(Uri.parse("bayitplus://profile"))).isEqualTo(Route.Profile)
    }

    @Test
    fun `custom scheme settings - routes to Settings`() {
        assertThat(handler.parseUri(Uri.parse("bayitplus://settings"))).isEqualTo(Route.Settings)
    }

    @Test
    fun `custom scheme rewards - routes to Rewards`() {
        assertThat(handler.parseUri(Uri.parse("bayitplus://rewards"))).isEqualTo(Route.Rewards)
    }

    @Test
    fun `custom scheme trivia - routes to Trivia with id`() {
        val uri = Uri.parse("bayitplus://trivia/ch-1")
        assertThat(handler.parseUri(uri)).isEqualTo(Route.Trivia("ch-1"))
    }

    @Test
    fun `custom scheme chess - routes to Chess with optional id`() {
        assertThat(handler.parseUri(Uri.parse("bayitplus://chess/game-1"))).isEqualTo(Route.Chess("game-1"))
        assertThat(handler.parseUri(Uri.parse("bayitplus://chess"))).isEqualTo(Route.Chess(null))
    }

    @Test
    fun `custom scheme messages - routes to DirectMessages`() {
        assertThat(handler.parseUri(Uri.parse("bayitplus://messages"))).isEqualTo(Route.DirectMessages)
    }

    @Test
    fun `custom scheme watchparty with id - routes to WatchPartyDetail`() {
        assertThat(handler.parseUri(Uri.parse("bayitplus://watchparty/wp-5"))).isEqualTo(Route.WatchPartyDetail("wp-5"))
    }

    @Test
    fun `custom scheme watchparty without id - routes to WatchParty`() {
        assertThat(handler.parseUri(Uri.parse("bayitplus://watchparty"))).isEqualTo(Route.WatchParty)
    }

    @Test
    fun `custom scheme zehani - routes to ZehAni`() {
        assertThat(handler.parseUri(Uri.parse("bayitplus://zehani"))).isEqualTo(Route.ZehAni)
    }

    @Test
    fun `custom scheme onboarding ai - routes to OnboardingAI`() {
        assertThat(handler.parseUri(Uri.parse("bayitplus://onboarding/ai"))).isEqualTo(Route.OnboardingAI)
    }

    @Test
    fun `custom scheme onboarding voice - routes to VoiceOnboarding`() {
        assertThat(handler.parseUri(Uri.parse("bayitplus://onboarding/voice"))).isEqualTo(Route.VoiceOnboarding)
    }

    @Test
    fun `custom scheme onboarding no segment - routes to FeatureTour`() {
        assertThat(handler.parseUri(Uri.parse("bayitplus://onboarding"))).isEqualTo(Route.FeatureTour)
    }

    @Test
    fun `custom scheme feature-tour - routes to FeatureTour`() {
        assertThat(handler.parseUri(Uri.parse("bayitplus://feature-tour"))).isEqualTo(Route.FeatureTour)
    }

    @Test
    fun `custom scheme unknown host - returns null`() {
        assertThat(handler.parseUri(Uri.parse("bayitplus://unknown/path"))).isNull()
    }

    // --- Universal links (bayit.tv) ---

    @Test
    fun `universal link empty path - routes to Home`() {
        val uri = mockk<Uri>()
        every { uri.scheme } returns "https"
        every { uri.host } returns "bayit.tv"
        every { uri.pathSegments } returns emptyList()
        assertThat(handler.parseUri(uri)).isEqualTo(Route.Home)
    }

    @Test
    fun `universal link watch segment - routes to Player`() {
        val uri = Uri.parse("https://bayit.tv/watch/content-1?type=series")
        assertThat(handler.parseUri(uri)).isEqualTo(Route.Player("content-1", "series"))
    }

    @Test
    fun `universal link movie segment - routes to MovieDetail`() {
        val uri = Uri.parse("https://bayit.tv/movie/m-10")
        assertThat(handler.parseUri(uri)).isEqualTo(Route.MovieDetail("m-10"))
    }

    @Test
    fun `universal link series segment - routes to SeriesDetail`() {
        val uri = Uri.parse("https://bayit.tv/series/s-5")
        assertThat(handler.parseUri(uri)).isEqualTo(Route.SeriesDetail("s-5"))
    }

    @Test
    fun `universal link live - routes to LiveTV`() {
        assertThat(handler.parseUri(Uri.parse("https://bayit.tv/live"))).isEqualTo(Route.LiveTV)
    }

    @Test
    fun `universal link radio - routes to Radio`() {
        assertThat(handler.parseUri(Uri.parse("https://bayit.tv/radio"))).isEqualTo(Route.Radio)
    }

    @Test
    fun `universal link podcasts - routes to Podcasts`() {
        assertThat(handler.parseUri(Uri.parse("https://bayit.tv/podcasts"))).isEqualTo(Route.Podcasts)
    }

    @Test
    fun `universal link rewards - routes to Rewards`() {
        assertThat(handler.parseUri(Uri.parse("https://bayit.tv/rewards"))).isEqualTo(Route.Rewards)
    }

    @Test
    fun `universal link trivia - routes to Trivia`() {
        assertThat(handler.parseUri(Uri.parse("https://bayit.tv/trivia/ch-7"))).isEqualTo(Route.Trivia("ch-7"))
    }

    @Test
    fun `universal link onboarding ai - routes to OnboardingAI`() {
        assertThat(handler.parseUri(Uri.parse("https://bayit.tv/onboarding/ai"))).isEqualTo(Route.OnboardingAI)
    }

    @Test
    fun `universal link feature-tour - routes to FeatureTour`() {
        assertThat(handler.parseUri(Uri.parse("https://bayit.tv/feature-tour"))).isEqualTo(Route.FeatureTour)
    }

    @Test
    fun `universal link www subdomain - resolved correctly`() {
        assertThat(handler.parseUri(Uri.parse("https://www.bayit.tv/live"))).isEqualTo(Route.LiveTV)
    }

    @Test
    fun `unknown host - returns null`() {
        assertThat(handler.parseUri(Uri.parse("https://other.com/watch/123"))).isNull()
    }

    @Test
    fun `handleIntent null intent - returns null`() {
        assertThat(handler.handleIntent(null)).isNull()
    }

    // --- helpers ---

    private fun buildUri(scheme: String, host: String, segments: List<String>): Uri {
        val mock = mockk<Uri>()
        every { mock.scheme } returns scheme
        every { mock.host } returns host
        every { mock.pathSegments } returns segments
        every { mock.getQueryParameter(any()) } returns null
        return mock
    }
}
