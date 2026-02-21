package tv.bayit.plus.core.network

import app.cash.turbine.test
import com.google.common.truth.Truth.assertThat
import kotlinx.coroutines.test.runTest
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import tv.bayit.plus.core.testing.CoroutineTestRule

/**
 * Unit tests for [SessionEventBus].
 *
 * Validates: session-expired event emission and multi-collector delivery.
 */
@ExtendWith(CoroutineTestRule::class)
class SessionEventBusTest {

    @Test
    fun `notifySessionExpired - emits to sessionExpired flow`() = runTest {
        SessionEventBus.sessionExpired.test {
            SessionEventBus.notifySessionExpired()
            assertThat(awaitItem()).isEqualTo(Unit)
            cancelAndIgnoreRemainingEvents()
        }
    }

    @Test
    fun `notifySessionExpired - multiple calls emit multiple events`() = runTest {
        SessionEventBus.sessionExpired.test {
            SessionEventBus.notifySessionExpired()
            SessionEventBus.notifySessionExpired()
            awaitItem()
            awaitItem()
            cancelAndIgnoreRemainingEvents()
        }
    }

    @Test
    fun `sessionExpired - no emission before notifySessionExpired is called`() = runTest {
        SessionEventBus.sessionExpired.test {
            expectNoEvents()
            cancelAndIgnoreRemainingEvents()
        }
    }
}
