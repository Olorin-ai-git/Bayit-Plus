package tv.bayit.plus.feature.social.chess

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import tv.bayit.plus.core.model.ChessMoveEntry
import tv.bayit.plus.designsystem.component.GlassCard
import tv.bayit.plus.designsystem.theme.DesignTokens

@Composable
internal fun ChessMoveHistoryView(
    moves: List<ChessMoveEntry>,
    modifier: Modifier = Modifier,
) {
    val listState = rememberLazyListState()

    LaunchedEffect(moves.size) {
        if (moves.isNotEmpty()) {
            listState.animateScrollToItem(moves.size - 1)
        }
    }

    val movePairs = buildMovePairs(moves)

    LazyRow(
        state = listState,
        modifier = modifier,
        horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm),
    ) {
        itemsIndexed(movePairs) { _, pair ->
            GlassCard {
                Row(
                    modifier = Modifier.padding(
                        horizontal = DesignTokens.Spacing.sm,
                        vertical = DesignTokens.Spacing.xs,
                    ),
                    horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.xs),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(
                        text = "${pair.moveNumber}.",
                        color = DesignTokens.Colors.Text.muted,
                        fontSize = DesignTokens.FontSize.xs,
                        fontFamily = FontFamily.Monospace,
                    )
                    Text(
                        text = pair.whiteMove,
                        color = DesignTokens.Colors.Text.primary,
                        fontSize = DesignTokens.FontSize.sm,
                        fontWeight = FontWeight.Medium,
                        fontFamily = FontFamily.Monospace,
                    )
                    pair.blackMove?.let { black ->
                        Text(
                            text = black,
                            color = DesignTokens.Colors.Text.secondary,
                            fontSize = DesignTokens.FontSize.sm,
                            fontWeight = FontWeight.Medium,
                            fontFamily = FontFamily.Monospace,
                        )
                    }
                }
            }
        }
    }
}

private data class MovePair(val moveNumber: Int, val whiteMove: String, val blackMove: String?)

private fun buildMovePairs(moves: List<ChessMoveEntry>): List<MovePair> {
    val pairs = mutableListOf<MovePair>()
    var index = 0
    var moveNum = 1
    while (index < moves.size) {
        val white = moves[index].san
        val black = moves.getOrNull(index + 1)?.san
        pairs.add(MovePair(moveNum, white, black))
        index += if (black != null) 2 else 1
        moveNum++
    }
    return pairs
}
