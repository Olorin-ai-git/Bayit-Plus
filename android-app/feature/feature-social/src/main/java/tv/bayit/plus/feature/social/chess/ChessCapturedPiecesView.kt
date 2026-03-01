package tv.bayit.plus.feature.social.chess

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import tv.bayit.plus.designsystem.component.GlassCard
import tv.bayit.plus.designsystem.i18n.bayitString
import tv.bayit.plus.designsystem.theme.DesignTokens

private val PIECE_VALUE = mapOf(
    'P' to 1, 'p' to 1,
    'N' to 3, 'n' to 3,
    'B' to 3, 'b' to 3,
    'R' to 5, 'r' to 5,
    'Q' to 9, 'q' to 9,
)

@Composable
internal fun ChessCapturedPiecesView(
    capturedByWhite: List<Char>,
    capturedByBlack: List<Char>,
    modifier: Modifier = Modifier,
) {
    GlassCard(modifier = modifier.fillMaxWidth()) {
        Column(
            modifier = Modifier.padding(DesignTokens.Spacing.sm),
            verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.xs),
        ) {
            CapturedRow(
                pieces = capturedByBlack.sortedBy { PIECE_VALUE[it] ?: 0 },
                label = bayitString("chess.whiteCaptured"),
            )
            CapturedRow(
                pieces = capturedByWhite.sortedBy { PIECE_VALUE[it] ?: 0 },
                label = bayitString("chess.blackCaptured"),
            )
        }
    }
}

@Composable
private fun CapturedRow(pieces: List<Char>, label: String) {
    if (pieces.isEmpty()) return
    Row(
        horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.xs),
    ) {
        Text(
            text = "$label: ",
            color = DesignTokens.Colors.Text.muted,
            fontSize = DesignTokens.FontSize.xs,
        )
        pieces.forEach { piece ->
            Text(
                text = fenCharToUnicode(piece),
                fontSize = DesignTokens.FontSize.base,
                color = DesignTokens.Colors.Text.primary,
            )
        }
    }
}
