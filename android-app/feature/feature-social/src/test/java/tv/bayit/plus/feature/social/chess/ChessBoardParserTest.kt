package tv.bayit.plus.feature.social.chess

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Test

class ChessBoardParserTest {

    private val startingFen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"

    @Test
    fun `parseFen starting position has 32 pieces`() {
        val board = parseFen(startingFen)
        val pieces = board.flatten().filterNotNull()
        assertEquals(32, pieces.size)
    }

    @Test
    fun `parseFen starting position rook at a8`() {
        val board = parseFen(startingFen)
        assertEquals('r', board[0][0])
    }

    @Test
    fun `parseFen starting position white rook at a1`() {
        val board = parseFen(startingFen)
        assertEquals('R', board[7][0])
    }

    @Test
    fun `parseFen empty square returns null`() {
        val board = parseFen(startingFen)
        assertNull(board[2][0])
        assertNull(board[5][7])
    }

    @Test
    fun `parseFen king positions correct`() {
        val board = parseFen(startingFen)
        assertEquals('k', board[0][4])
        assertEquals('K', board[7][4])
    }

    @Test
    fun `parseFen returns 8x8 board`() {
        val board = parseFen(startingFen)
        assertEquals(8, board.size)
        board.forEach { row -> assertEquals(8, row.size) }
    }

    @Test
    fun `fenCharToUnicode maps all white pieces`() {
        assertEquals("\u2654", fenCharToUnicode('K'))
        assertEquals("\u2655", fenCharToUnicode('Q'))
        assertEquals("\u2656", fenCharToUnicode('R'))
        assertEquals("\u2657", fenCharToUnicode('B'))
        assertEquals("\u2658", fenCharToUnicode('N'))
        assertEquals("\u2659", fenCharToUnicode('P'))
    }

    @Test
    fun `fenCharToUnicode maps all black pieces`() {
        assertEquals("\u265A", fenCharToUnicode('k'))
        assertEquals("\u265B", fenCharToUnicode('q'))
        assertEquals("\u265C", fenCharToUnicode('r'))
        assertEquals("\u265D", fenCharToUnicode('b'))
        assertEquals("\u265E", fenCharToUnicode('n'))
        assertEquals("\u265F", fenCharToUnicode('p'))
    }

    @Test
    fun `getPieceAt starting position white pawn row`() {
        val ranks = startingFen.split(" ").first().split("/")
        assertEquals("\u2659", getPieceAt(ranks, 6, 0))
        assertEquals("\u2659", getPieceAt(ranks, 6, 7))
    }

    @Test
    fun `getPieceAt empty square returns null`() {
        val ranks = startingFen.split(" ").first().split("/")
        assertNull(getPieceAt(ranks, 2, 0))
        assertNull(getPieceAt(ranks, 4, 4))
    }

    @Test
    fun `getPieceAt black rook at corner`() {
        val ranks = startingFen.split(" ").first().split("/")
        assertEquals("\u265C", getPieceAt(ranks, 0, 0))
        assertEquals("\u265C", getPieceAt(ranks, 0, 7))
    }

    @Test
    fun `parseFen handles position after e2e4`() {
        val fen = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1"
        val board = parseFen(fen)
        assertNull(board[6][4])
        assertEquals('P', board[4][4])
    }
}
