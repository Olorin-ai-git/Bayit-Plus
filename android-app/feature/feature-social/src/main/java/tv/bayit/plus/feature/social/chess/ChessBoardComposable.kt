package tv.bayit.plus.feature.social.chess

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import tv.bayit.plus.designsystem.theme.DesignTokens

private const val BOARD_SIZE = 8

@Composable
internal fun ChessBoardComposable(
    board: List<List<Char?>>,
    selectedSquare: Pair<Int, Int>?,
    currentTurn: String,
    onSquareTap: (Int, Int) -> Unit,
    modifier: Modifier = Modifier,
) {
    LazyVerticalGrid(
        columns = GridCells.Fixed(BOARD_SIZE),
        modifier = modifier
            .fillMaxWidth()
            .aspectRatio(1f),
        userScrollEnabled = false,
    ) {
        items(BOARD_SIZE * BOARD_SIZE) { index ->
            val row = index / BOARD_SIZE
            val col = index % BOARD_SIZE
            val isLight = (row + col) % 2 == 0
            val isSelected = selectedSquare?.first == row && selectedSquare.second == col
            val piece = board.getOrNull(row)?.getOrNull(col)

            val file = ('a' + col)
            val rank = (8 - row)
            val squareLabel = "$file$rank"
            val pieceDesc = piece?.let { fenCharToUnicode(it) }

            Box(
                modifier = Modifier
                    .aspectRatio(1f)
                    .background(
                        when {
                            isSelected -> DesignTokens.Colors.gold.copy(alpha = 0.6f)
                            isLight -> DesignTokens.Colors.Primary.p200
                            else -> DesignTokens.Colors.Primary.p800
                        }
                    )
                    .clickable { onSquareTap(row, col) }
                    .semantics {
                        contentDescription = if (pieceDesc != null) "$pieceDesc at $squareLabel"
                        else "Empty square $squareLabel"
                    },
                contentAlignment = Alignment.Center,
            ) {
                if (piece != null) {
                    Text(
                        text = fenCharToUnicode(piece),
                        fontSize = DesignTokens.FontSize.xl,
                        color = DesignTokens.Colors.Text.primary,
                    )
                }
                if (col == 0) {
                    Text(
                        text = rank.toString(),
                        fontSize = DesignTokens.FontSize.xs,
                        color = if (isLight) DesignTokens.Colors.Primary.p800 else DesignTokens.Colors.Primary.p200,
                        modifier = Modifier.align(Alignment.TopStart),
                    )
                }
                if (row == 7) {
                    Text(
                        text = file.toString(),
                        fontSize = DesignTokens.FontSize.xs,
                        color = if (isLight) DesignTokens.Colors.Primary.p800 else DesignTokens.Colors.Primary.p200,
                        modifier = Modifier.align(Alignment.BottomEnd),
                    )
                }
            }
        }
    }
}
