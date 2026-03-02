package tv.bayit.plus.feature.social.chess

import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource

private const val SCALE_KING_QUEEN = 1.4f
private const val SCALE_ROOK = 1.2f
private const val SCALE_BISHOP_KNIGHT = 1.15f
private const val SCALE_PAWN = 1.0f

private const val OFFSET_KING_QUEEN = -0.15f
private const val OFFSET_ROOK = -0.06f
private const val OFFSET_BISHOP_KNIGHT = -0.04f

private const val SHADOW_ELEVATION_ALPHA = 0.4f
private const val SHADOW_TRANSLATE_X = 1f
private const val SHADOW_TRANSLATE_Y = 2f

@Composable
internal fun ChessPieceImage(
    piece: Char,
    cellSizePx: Float,
    modifier: Modifier = Modifier,
) {
    val drawableRes = fenCharToDrawableRes(piece)
    val scale = pieceScale(piece)
    val yOffset = pieceYOffset(piece, cellSizePx)

    Image(
        painter = painterResource(drawableRes),
        contentDescription = fenCharToUnicode(piece),
        contentScale = ContentScale.Fit,
        modifier = modifier
            .fillMaxSize()
            .graphicsLayer {
                scaleX = scale
                scaleY = scale
                translationY = yOffset
                shadowElevation = 4f
                translationX = SHADOW_TRANSLATE_X
                ambientShadowColor = androidx.compose.ui.graphics.Color.Black
                    .copy(alpha = SHADOW_ELEVATION_ALPHA)
                spotShadowColor = androidx.compose.ui.graphics.Color.Black
                    .copy(alpha = SHADOW_ELEVATION_ALPHA)
            },
    )
}

private fun pieceScale(piece: Char): Float = when (piece.lowercaseChar()) {
    'k', 'q' -> SCALE_KING_QUEEN
    'r' -> SCALE_ROOK
    'b', 'n' -> SCALE_BISHOP_KNIGHT
    else -> SCALE_PAWN
}

private fun pieceYOffset(piece: Char, cellSizePx: Float): Float =
    when (piece.lowercaseChar()) {
        'k', 'q' -> cellSizePx * OFFSET_KING_QUEEN
        'r' -> cellSizePx * OFFSET_ROOK
        'b', 'n' -> cellSizePx * OFFSET_BISHOP_KNIGHT
        else -> 0f
    }
