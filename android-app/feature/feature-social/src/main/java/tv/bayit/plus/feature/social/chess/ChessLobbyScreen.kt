package tv.bayit.plus.feature.social.chess

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
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

@Composable
internal fun ChessLobbyScreen(
    onCreateGame: (color: String, gameMode: String, botDifficulty: String?) -> Unit,
    onJoinGame: (gameCode: String) -> Unit,
    modifier: Modifier = Modifier,
) {
    var selectedMode by remember { mutableStateOf<String?>(null) }
    var selectedColor by remember { mutableStateOf("white") }
    var selectedDifficulty by remember { mutableStateOf("medium") }
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
                text = "Play vs Player",
                onClick = { selectedMode = "pvp" },
                isPrimary = selectedMode == "pvp",
                modifier = Modifier.weight(1f),
            )
            GlassButton(
                text = "Play vs Bot",
                onClick = { selectedMode = "bot" },
                isPrimary = selectedMode == "bot",
                modifier = Modifier.weight(1f),
            )
        }

        if (selectedMode != null) {
            GlassCard(modifier = Modifier.fillMaxWidth()) {
                Column(
                    verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md),
                ) {
                    Text(
                        text = "Choose your color",
                        style = MaterialTheme.typography.bodyMedium,
                        color = DesignTokens.Colors.Text.secondary,
                    )
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm),
                    ) {
                        GlassButton(
                            text = "White",
                            onClick = { selectedColor = "white" },
                            isPrimary = selectedColor == "white",
                            modifier = Modifier.weight(1f),
                        )
                        GlassButton(
                            text = "Black",
                            onClick = { selectedColor = "black" },
                            isPrimary = selectedColor == "black",
                            modifier = Modifier.weight(1f),
                        )
                    }

                    if (selectedMode == "bot") {
                        Text(
                            text = "Difficulty",
                            style = MaterialTheme.typography.bodyMedium,
                            color = DesignTokens.Colors.Text.secondary,
                        )
                        Row(horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm)) {
                            listOf("easy", "medium", "hard").forEach { diff ->
                                GlassButton(
                                    text = diff.replaceFirstChar { it.uppercase() },
                                    onClick = { selectedDifficulty = diff },
                                    isPrimary = selectedDifficulty == diff,
                                    modifier = Modifier.weight(1f),
                                )
                            }
                        }
                    }

                    GlassButton(
                        text = if (selectedMode == "bot") "Play vs Bot" else "Create Game",
                        onClick = {
                            onCreateGame(
                                selectedColor,
                                selectedMode!!,
                                if (selectedMode == "bot") selectedDifficulty else null,
                            )
                        },
                        modifier = Modifier.fillMaxWidth(),
                    )
                }
            }
        }

        GlassCard(modifier = Modifier.fillMaxWidth()) {
            Column(verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md)) {
                Text(
                    text = "Join by game code",
                    style = MaterialTheme.typography.bodyMedium,
                    color = DesignTokens.Colors.Text.secondary,
                )
                Row(
                    horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    GlassTextField(
                        value = joinCode,
                        onValueChange = { if (it.length <= 6) joinCode = it.uppercase() },
                        placeholder = "Enter game code",
                        modifier = Modifier.weight(1f),
                    )
                    GlassButton(
                        text = "Join",
                        onClick = { if (joinCode.length == 6) onJoinGame(joinCode) },
                        enabled = joinCode.length == 6,
                    )
                }
            }
        }
    }
}
