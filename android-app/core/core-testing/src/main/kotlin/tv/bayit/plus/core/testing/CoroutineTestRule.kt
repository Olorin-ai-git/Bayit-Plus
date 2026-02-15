package tv.bayit.plus.core.testing

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.test.*
import org.junit.jupiter.api.extension.AfterEachCallback
import org.junit.jupiter.api.extension.BeforeEachCallback
import org.junit.jupiter.api.extension.ExtensionContext

/**
 * JUnit 5 test rule for coroutine testing.
 *
 * Sets up the main dispatcher as a test dispatcher before each test
 * and resets it after each test.
 *
 * Usage:
 * ```
 * class MyViewModelTest {
 *     @JvmField
 *     @RegisterExtension
 *     val coroutineTestRule = CoroutineTestRule()
 *
 *     @Test
 *     fun `test async operation`() = runTest {
 *         // Test code here
 *     }
 * }
 * ```
 */
class CoroutineTestRule(
    private val dispatcher: TestDispatcher = UnconfinedTestDispatcher()
) : BeforeEachCallback, AfterEachCallback {

    override fun beforeEach(context: ExtensionContext?) {
        Dispatchers.setMain(dispatcher)
    }

    override fun afterEach(context: ExtensionContext?) {
        Dispatchers.resetMain()
    }
}
