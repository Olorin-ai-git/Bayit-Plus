package tv.bayit.plus.feature.social.chess

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import tv.bayit.plus.designsystem.component.GlassButton
import tv.bayit.plus.designsystem.component.GlassCard
import tv.bayit.plus.designsystem.component.GlassTextField
import tv.bayit.plus.designsystem.i18n.bayitString
import tv.bayit.plus.designsystem.theme.DesignTokens

private val TIME_CONTROLS = listOf<Pair<Int?, String>>(
    null to "chess.unlimited", 1 to "chess.bullet1", 3 to "chess.blitz3",
    5 to "chess.blitz5", 10 to "chess.rapid10", 30 to "chess.classical30",
)

@OptIn(ExperimentalLayoutApi::class)
@Composable
internal fun ChessLobbyScreen(
    onCreateGame: (color: String, gameMode: String, botDifficulty: String?, timeControl: Int?) -> Unit,
    onJoinGame: (gameCode: String) -> Unit,
    modifier: Modifier = Modifier,
) {
    var selectedMode by remember { mutableStateOf<String?>(null) }
    var selectedColor by remember { mutableStateOf("white") }
    var selectedDifficulty by remember { mutableStateOf("medium") }
    var selectedTimeControl by remember { mutableStateOf<Int?>(null) }
    var joinCode by remember { mutableStateOf("") }

    Column(
        modifier = modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(DesignTokens.Spacing.base),
        verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.lg),
    ) {
        Text(
            text = bayitString("chess.gameMode"),
            style = MaterialTheme.typography.titleMedium,
            color = DesignTokens.Colors.Text.primary,
            fontWeight = FontWeight.SemiBold,
        )

        Row(
            horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md),
            modifier = Modifier.fillMaxWidth(),
        ) {
            GlassButton(
                text = bayitString("chess.playVsFriend"),
                onClick = { selectedMode = "pvp" },
                isPrimary = selectedMode == "pvp",
                modifier = Modifier.weight(1f),
            )
            GlassButton(
                text = bayitString("chess.playVsBot"),
                onClick = { selectedMode = "bot" },
                isPrimary = selectedMode == "bot",
                modifier = Modifier.weight(1f),
            )
        }

        if (selectedMode != null) {
            GlassCard(modifier = Modifier.fillMaxWidth()) {
                Column(verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md)) {
                    ColorPickerSection(selectedColor) { selectedColor = it }
                    if (selectedMode == "bot") {
                        DifficultySection(selectedDifficulty) { selectedDifficulty = it }
                    }
                    TimeControlSection(selectedTimeControl) { selectedTimeControl = it }
                    GlassButton(
                        text = if (selectedMode == "bot") bayitString("chess.playVsBot")
                        else bayitString("chess.createGame"),
                        onClick = {
                            onCreateGame(
                                selectedColor,
                                selectedMode!!,
                                if (selectedMode == "bot") selectedDifficulty else null,
                                selectedTimeControl,
                            )
                        },
                        modifier = Modifier.fillMaxWidth(),
                    )
                }
            }
        }

        JoinGameCard(joinCode, onCodeChange = { joinCode = it }, onJoin = onJoinGame)
    }
}

@Composable
private fun ColorPickerSection(selected: String, onSelect: (String) -> Unit) {
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
private fun DifficultySection(selected: String, onSelect: (String) -> Unit) {
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
private fun TimeControlSection(selected: Int?, onSelect: (Int?) -> Unit) {
    SectionLabel("chess.timeControl")
    FlowRow(
        horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm),
        verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm),
    ) {
        TIME_CONTROLS.forEach { (minutes, key) ->
            GlassButton(
                text = bayitString(key),
                onClick = { onSelect(minutes) },
                isPrimary = selected == minutes,
            )
        }
    }
}

@Composable
private fun SectionLabel(key: String) {
    Text(text = bayitString(key), style = MaterialTheme.typography.bodyMedium, color = DesignTokens.Colors.Text.secondary)
}

@Composable
private fun JoinGameCard(
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
                    onValueChange = { if (it.length <= 6) onCodeChange(it.uppercase()) },
                    placeholder = bayitString("chess.enterGameCode"),
                    modifier = Modifier.weight(1f),
                )
                GlassButton(
                    text = bayitString("chess.join"),
                    onClick = { if (joinCode.length == 6) onJoin(joinCode) },
                    enabled = joinCode.length == 6,
                )
            }
        }
    }
}
