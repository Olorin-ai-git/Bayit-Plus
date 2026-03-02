package tv.bayit.plus.feature.social.chess

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import tv.bayit.plus.designsystem.component.GlassButton
import tv.bayit.plus.designsystem.component.GlassCard
import tv.bayit.plus.designsystem.component.GlassTextField
import tv.bayit.plus.designsystem.i18n.bayitString
import tv.bayit.plus.designsystem.theme.DesignTokens

private const val JOIN_CODE_LENGTH = 6

@Composable
internal fun JoinGameCard(
    joinCode: String,
    onCodeChange: (String) -> Unit,
    onJoin: (String) -> Unit,
) {
    GlassCard(modifier = Modifier.fillMaxWidth()) {
        Column(verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md)) {
            Text(
                text = bayitString("chess.joinByGameCode"),
                style = MaterialTheme.typography.bodyMedium,
                color = DesignTokens.Colors.Text.secondary,
            )
            Row(
                horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                GlassTextField(
                    value = joinCode,
                    onValueChange = { if (it.length <= JOIN_CODE_LENGTH) onCodeChange(it.uppercase()) },
                    placeholder = bayitString("chess.enterGameCode"),
                    modifier = Modifier.weight(1f),
                )
                GlassButton(
                    text = bayitString("chess.join"),
                    onClick = { if (joinCode.length == JOIN_CODE_LENGTH) onJoin(joinCode) },
                    enabled = joinCode.length == JOIN_CODE_LENGTH,
                )
            }
        }
    }
}

@Composable
internal fun ColorPickerSection(selected: String, onSelect: (String) -> Unit) {
    SectionLabel("chess.chooseColor")
    Row(horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm)) {
        listOf("white", "black").forEach { color ->
            GlassButton(
                text = bayitString("chess.$color"),
                onClick = { onSelect(color) },
                isPrimary = selected == color,
                modifier = Modifier.weight(1f),
            )
        }
    }
}

@Composable
internal fun DifficultySection(selected: String, onSelect: (String) -> Unit) {
    SectionLabel("chess.difficulty")
    Row(horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm)) {
        listOf("easy", "medium", "hard").forEach { diff ->
            GlassButton(
                text = bayitString("chess.$diff"),
                onClick = { onSelect(diff) },
                isPrimary = selected == diff,
                modifier = Modifier.weight(1f),
            )
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
internal fun TimeControlSection(
    timeControls: List<Pair<Int?, String>>,
    selected: Int?,
    onSelect: (Int?) -> Unit,
) {
    SectionLabel("chess.timeControl")
    FlowRow(
        horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm),
        verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm),
    ) {
        timeControls.forEach { (minutes, key) ->
            GlassButton(
                text = bayitString(key),
                onClick = { onSelect(minutes) },
                isPrimary = selected == minutes,
            )
        }
    }
}

@Composable
internal fun SectionLabel(key: String) {
    Text(
        text = bayitString(key),
        style = MaterialTheme.typography.bodyMedium,
        color = DesignTokens.Colors.Text.secondary,
    )
}
