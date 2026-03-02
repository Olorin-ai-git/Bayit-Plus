package tv.bayit.plus.feature.social.chess

import androidx.lifecycle.SavedStateHandle
import app.cash.turbine.test
import io.mockk.coEvery
import io.mockk.every
import io.mockk.mockk
import io.mockk.verify
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.common.logging.BayitLogger
import tv.bayit.plus.core.data.repository.ChessRepository
import tv.bayit.plus.core.model.ChessGame

@OptIn(ExperimentalCoroutinesApi::class)
class ChessViewModelTest {

    private val testDispatcher = StandardTestDispatcher()
    private val chessRepository: ChessRepository = mockk()
    private val chessWebSocketHandler: ChessWebSocketHandler = mockk(relaxed = true)
    private val logger: BayitLogger = mockk(relaxed = true)

    private fun buildGame(
        code: String = "ABCD12",
        status: String = "active",
        fen: String = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    ) = ChessGame(
        id = "game-id",
        gameCode = code,
        status = status,
        boardFen = fen,
    )

    private fun buildViewModel() = ChessViewModel(
        chessRepository = chessRepository,
        chessWebSocketHandler = chessWebSocketHandler,
        logger = logger,
        savedStateHandle = SavedStateHandle(),
    )

    @BeforeEach
    fun setup() {
        Dispatchers.setMain(testDispatcher)
        every { chessWebSocketHandler.connect(any()) } returns flowOf()
        coEvery { chessRepository.loadChatHistory(any()) } returns BayitResult.Success(emptyList())
    }

    @AfterEach
    fun teardown() {
        Dispatchers.resetMain()
    }

    @Test
    fun `initial state is Lobby`() = runTest {
        val vm = buildViewModel()
        vm.uiState.test {
            assertEquals(ChessUiState.Lobby(), awaitItem())
            cancelAndIgnoreRemainingEvents()
        }
    }

    @Test
    fun `createGame success transitions to GameActive`() = runTest {
        val game = buildGame()
        coEvery { chessRepository.createGame(any(), any(), any(), any()) } returns BayitResult.Success(game)

        val vm = buildViewModel()
        vm.uiState.test {
            assertEquals(ChessUiState.Lobby(), awaitItem())
            vm.createGame("white", "pvp", null, null)
            assertEquals(ChessUiState.Loading, awaitItem())
            val active = awaitItem() as ChessUiState.GameActive
            assertEquals(game, active.game)
            assertEquals(8, active.board.size)
            cancelAndIgnoreRemainingEvents()
        }
    }

    @Test
    fun `createGame failure emits Error state`() = runTest {
        val error = RuntimeException("Network error")
        coEvery { chessRepository.createGame(any(), any(), any(), any()) } returns BayitResult.Error(error)

        val vm = buildViewModel()
        vm.uiState.test {
            awaitItem() // Lobby
            vm.createGame("white", "pvp", null, null)
            awaitItem() // Loading
            val errorState = awaitItem() as ChessUiState.Error
            assertTrue(errorState.message.isNotBlank())
            cancelAndIgnoreRemainingEvents()
        }
    }

    @Test
    fun `joinGame success transitions to GameActive`() = runTest {
        val game = buildGame(code = "JOIN01")
        coEvery { chessRepository.joinGame("JOIN01") } returns BayitResult.Success(game)

        val vm = buildViewModel()
        vm.uiState.test {
            awaitItem() // Lobby
            vm.joinGame("JOIN01")
            awaitItem() // Loading
            val active = awaitItem() as ChessUiState.GameActive
            assertEquals("JOIN01", active.game.gameCode)
            cancelAndIgnoreRemainingEvents()
        }
    }

    @Test
    fun `tapSquare first tap selects square with piece`() = runTest {
        val game = buildGame()
        coEvery { chessRepository.createGame(any(), any(), any(), any()) } returns BayitResult.Success(game)
        every { chessWebSocketHandler.connect(any()) } returns flowOf()

        val vm = buildViewModel()
        vm.createGame("white", "pvp", null, null)
        testDispatcher.scheduler.advanceUntilIdle()

        val state = vm.uiState.value as ChessUiState.GameActive
        assertNull(state.selectedSquare)
        vm.tapSquare(6, 0)

        val updated = vm.uiState.value as ChessUiState.GameActive
        assertEquals(Pair(6, 0), updated.selectedSquare)
    }

    @Test
    fun `tapSquare second tap sends move and clears selection`() = runTest {
        val game = buildGame()
        coEvery { chessRepository.createGame(any(), any(), any(), any()) } returns BayitResult.Success(game)
        every { chessWebSocketHandler.connect(any()) } returns flowOf()
        every { chessWebSocketHandler.send(any()) } returns true

        val vm = buildViewModel()
        vm.createGame("white", "pvp", null, null)
        testDispatcher.scheduler.advanceUntilIdle()

        vm.tapSquare(6, 0)
        vm.tapSquare(4, 0)

        val state = vm.uiState.value as ChessUiState.GameActive
        assertNull(state.selectedSquare)
        verify { chessWebSocketHandler.send(match { it.contains("\"type\":\"move\"") }) }
    }

    @Test
    fun `drawOffer event sets drawOffered true`() = runTest {
        val game = buildGame()
        coEvery { chessRepository.createGame(any(), any(), any(), any()) } returns BayitResult.Success(game)
        every { chessWebSocketHandler.connect(any()) } returns flowOf(ChessWsEvent.DrawOffer)

        val vm = buildViewModel()
        vm.uiState.test {
            awaitItem() // Lobby
            vm.createGame("white", "pvp", null, null)
            awaitItem() // Loading
            val active = awaitItem() as ChessUiState.GameActive
            assertTrue(!active.drawOffered)
            val withOffer = awaitItem() as ChessUiState.GameActive
            assertTrue(withOffer.drawOffered)
            cancelAndIgnoreRemainingEvents()
        }
    }

    @Test
    fun `squareNotation converts correctly`() {
        val vm = buildViewModel()
        assertEquals("a8", vm.squareNotation(0, 0))
        assertEquals("e2", vm.squareNotation(6, 4))
        assertEquals("h1", vm.squareNotation(7, 7))
    }
}
