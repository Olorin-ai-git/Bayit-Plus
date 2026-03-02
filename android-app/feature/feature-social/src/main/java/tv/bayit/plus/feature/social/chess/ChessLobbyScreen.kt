package tv.bayit.plus.feature.social.chess

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
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
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import tv.bayit.plus.designsystem.component.GlassButton
import tv.bayit.plus.designsystem.component.GlassCard
import tv.bayit.plus.designsystem.i18n.bayitString
import tv.bayit.plus.designsystem.theme.DesignTokens
import tv.bayit.plus.feature.social.R

private val HERO_HEIGHT = 200.dp

private val TIME_CONTROLS = listOf<Pair<Int?, String>>(
    null to "chess.unlimited", 1 to "chess.bullet1", 3 to "chess.blitz3",
    5 to "chess.blitz5", 10 to "chess.rapid10", 30 to "chess.classical30",
)

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
            .verticalScroll(rememberScrollState()),
    ) {
        ChessHero()

        Column(
            modifier = Modifier.padding(DesignTokens.Spacing.base),
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
                        TimeControlSection(TIME_CONTROLS, selectedTimeControl) { selectedTimeControl = it }
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
}

@Composable
private fun ChessHero() {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(HERO_HEIGHT),
    ) {
        Image(
            painter = painterResource(R.drawable.chess_splash),
            contentDescription = null,
            contentScale = ContentScale.Crop,
            modifier = Modifier.fillMaxSize(),
        )
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    Brush.verticalGradient(
                        colors = listOf(
                            Color.Transparent,
                            DesignTokens.Colors.Background.primary,
                        ),
                    ),
                ),
        )
        Column(
            modifier = Modifier
                .align(Alignment.BottomStart)
                .padding(horizontal = DesignTokens.Spacing.base)
                .padding(bottom = DesignTokens.Spacing.xxxl),
            verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.xs),
        ) {
            Text(
                text = bayitString("chess.title"),
                style = MaterialTheme.typography.displaySmall,
                color = DesignTokens.Colors.Text.primary,
                fontWeight = FontWeight.Bold,
            )
            Text(
                text = bayitString("chess.subtitle"),
                style = MaterialTheme.typography.bodyMedium,
                color = DesignTokens.Colors.Text.secondary,
            )
        }
    }
}
