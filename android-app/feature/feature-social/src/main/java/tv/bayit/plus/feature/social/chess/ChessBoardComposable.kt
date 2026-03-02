package tv.bayit.plus.feature.social.chess

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.scaleIn
import androidx.compose.animation.scaleOut
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.IntOffset
import tv.bayit.plus.designsystem.theme.DesignTokens
import tv.bayit.plus.feature.social.R

private const val BOARD_SIZE = 8
private const val BOARD_INSET_RATIO = 0.10f
private const val PERSPECTIVE_TILT_DEGREES = 8f
private const val PERSPECTIVE_CAMERA_MULTIPLIER = 12f
private const val PERSPECTIVE_OFFSET_RATIO = 0.02f
private const val SELECTED_ALPHA = 0.45f
private const val LAST_MOVE_ALPHA = 0.20f
private const val PIECE_ENTER_SCALE = 0.7f
private const val SPRING_DAMPING = 0.85f

@Composable
internal fun ChessBoardComposable(
    board: List<List<Char?>>,
    selectedSquare: Pair<Int, Int>?,
    lastMove: Pair<String, String>?,
    currentTurn: String,
    onSquareTap: (Int, Int) -> Unit,
    modifier: Modifier = Modifier,
) {
    val lastMoveSquares = lastMove?.let { (from, to) ->
        setOf(from, to)
    } ?: emptySet()
    val density = LocalDensity.current

    Box(
        modifier = modifier
            .fillMaxWidth()
            .aspectRatio(1f)
            .clip(RoundedCornerShape(DesignTokens.Radius.md))
            .graphicsLayer {
                rotationX = PERSPECTIVE_TILT_DEGREES
                cameraDistance = density.density * PERSPECTIVE_CAMERA_MULTIPLIER
                translationY = -(size.width * PERSPECTIVE_OFFSET_RATIO)
            },
    ) {
        Image(
            painter = painterResource(R.drawable.chess_board),
            contentDescription = null,
            contentScale = ContentScale.Crop,
            modifier = Modifier.fillMaxSize(),
        )

        BoxWithConstraints(modifier = Modifier.fillMaxSize()) {
            val boardPx = with(density) { maxWidth.toPx() }
            val insetPx = boardPx * BOARD_INSET_RATIO
            val cellPx = (boardPx - 2 * insetPx) / BOARD_SIZE

            for (row in 0 until BOARD_SIZE) {
                for (col in 0 until BOARD_SIZE) {
                    val piece = board.getOrNull(row)?.getOrNull(col)
                    val isSelected =
                        selectedSquare?.first == row && selectedSquare.second == col
                    val file = ('a' + col)
                    val rank = (BOARD_SIZE - row)
                    val squareLabel = "$file$rank"
                    val isLastMove = squareLabel in lastMoveSquares
                    val pieceDesc = piece?.let { fenCharToUnicode(it) }

                    val xOffset = (insetPx + col * cellPx).toInt()
                    val yOffset = (insetPx + row * cellPx).toInt()

                    Box(
                        modifier = Modifier
                            .offset { IntOffset(xOffset, yOffset) }
                            .size(with(density) { cellPx.toDp() })
                            .then(
                                if (isSelected) {
                                    Modifier.background(
                                        DesignTokens.Colors.Primary.p400
                                            .copy(alpha = SELECTED_ALPHA),
                                    )
                                } else if (isLastMove) {
                                    Modifier.background(
                                        DesignTokens.Colors.Primary.p400
                                            .copy(alpha = LAST_MOVE_ALPHA),
                                    )
                                } else {
                                    Modifier.background(Color.Transparent)
                                },
                            )
                            .clickable { onSquareTap(row, col) }
                            .semantics {
                                contentDescription =
                                    if (pieceDesc != null) "$pieceDesc at $squareLabel"
                                    else "Empty square $squareLabel"
                            },
                        contentAlignment = Alignment.Center,
                    ) {
                        AnimatedContent(
                            targetState = piece,
                            transitionSpec = {
                                (fadeIn(
                                    animationSpec = androidx.compose.animation.core.spring(
                                        dampingRatio = SPRING_DAMPING,
                                    ),
                                ) + scaleIn(
                                    initialScale = PIECE_ENTER_SCALE,
                                    animationSpec = androidx.compose.animation.core.spring(
                                        dampingRatio = SPRING_DAMPING,
                                    ),
                                )).togetherWith(
                                    fadeOut(
                                        animationSpec = androidx.compose.animation.core.spring(
                                            dampingRatio = SPRING_DAMPING,
                                        ),
                                    ) + scaleOut(
                                        targetScale = PIECE_ENTER_SCALE,
                                        animationSpec = androidx.compose.animation.core.spring(
                                            dampingRatio = SPRING_DAMPING,
                                        ),
                                    ),
                                )
                            },
                            label = "piece_$squareLabel",
                        ) { targetPiece ->
                            if (targetPiece != null) {
                                ChessPieceImage(
                                    piece = targetPiece,
                                    cellSizePx = cellPx,
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}
