package tv.bayit.plus.feature.social.chess

import tv.bayit.plus.feature.social.R

/**
 * Returns the drawable resource for a FEN piece character.
 * Upper-case = white, lower-case = black.
 */
fun fenCharToDrawableRes(piece: Char): Int = when (piece) {
    'K' -> R.drawable.chess_piece_king_white
    'Q' -> R.drawable.chess_piece_queen_white
    'R' -> R.drawable.chess_piece_rook_white
    'B' -> R.drawable.chess_piece_bishop_white
    'N' -> R.drawable.chess_piece_knight_white
    'P' -> R.drawable.chess_piece_pawn_white
    'k' -> R.drawable.chess_piece_king_black
    'q' -> R.drawable.chess_piece_queen_black
    'r' -> R.drawable.chess_piece_rook_black
    'b' -> R.drawable.chess_piece_bishop_black
    'n' -> R.drawable.chess_piece_knight_black
    'p' -> R.drawable.chess_piece_pawn_black
    else -> R.drawable.chess_piece_pawn_white
}

/**
 * Parses a full FEN string into an 8x8 board of nullable chars.
 * Uppercase = white pieces, lowercase = black pieces, null = empty square.
 */
fun parseFen(fen: String): List<List<Char?>> {
    val ranks = fen.split(" ").firstOrNull()?.split("/").orEmpty()
    val board = Array(8) { arrayOfNulls<Char>(8) }
    for ((rowIndex, rank) in ranks.withIndex().take(8)) {
        var col = 0
        for (ch in rank) {
            if (ch.isDigit()) {
                col += ch.digitToInt()
            } else {
                if (col < 8) board[rowIndex][col] = ch
                col++
            }
        }
    }
    return board.map { it.toList() }
}

/**
 * Extracts the Unicode chess piece at the given board position from a FEN rank string list.
 *
 * @param ranks the slash-separated rank strings from a FEN position (e.g. "rnbqkbnr/pppppppp/...")
 * @param row board row (0 = rank 8, 7 = rank 1)
 * @param col board column (0 = file a, 7 = file h)
 * @return the Unicode character for the piece, or null if the square is empty
 */
fun getPieceAt(ranks: List<String>, row: Int, col: Int): String? {
    if (row >= ranks.size) return null
    var currentCol = 0
    for (ch in ranks[row]) {
        if (ch.isDigit()) {
            currentCol += ch.digitToInt()
        } else {
            if (currentCol == col) return fenCharToUnicode(ch)
            currentCol++
        }
        if (currentCol > col) return null
    }
    return null
}

/**
 * Maps a FEN character to its Unicode chess symbol.
 * Upper-case = white pieces, lower-case = black pieces.
 */
fun fenCharToUnicode(ch: Char): String = when (ch) {
    'K' -> "\u2654"; 'Q' -> "\u2655"; 'R' -> "\u2656"
    'B' -> "\u2657"; 'N' -> "\u2658"; 'P' -> "\u2659"
    'k' -> "\u265A"; 'q' -> "\u265B"; 'r' -> "\u265C"
    'b' -> "\u265D"; 'n' -> "\u265E"; 'p' -> "\u265F"
    else -> ch.toString()
}
