package tv.bayit.plus.feature.social.chess

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
