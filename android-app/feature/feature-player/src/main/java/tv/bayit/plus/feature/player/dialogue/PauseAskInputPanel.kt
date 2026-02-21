package tv.bayit.plus.feature.player.dialogue

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import tv.bayit.plus.designsystem.component.GlassTextField
import tv.bayit.plus.designsystem.i18n.bayitString
import tv.bayit.plus.designsystem.theme.DesignTokens

/**
 * Input panel for the INPUT phase of Pause-to-Ask.
 *
 * Displays the selected character's name, a text input field for the
 * question, and a send button. Follows the same pattern as [MessageInput].
 */
@Composable
internal fun PauseAskInputPanel(
    characterName: String,
    onSend: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    var questionText by remember { mutableStateOf("") }

    Column(
        modifier = modifier.padding(DesignTokens.Spacing.base),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(
            text = characterName,
            color = DesignTokens.Colors.Primary.light,
            fontSize = DesignTokens.FontSize.lg,
            fontWeight = FontWeight.Bold,
        )

        Spacer(modifier = Modifier.height(DesignTokens.Spacing.lg))

        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm),
        ) {
            GlassTextField(
                value = questionText,
                onValueChange = { questionText = it },
                modifier = Modifier.weight(1f),
                placeholder = bayitString("player.pauseAsk.placeholder"),
                singleLine = true,
            )
            IconButton(
                onClick = {
                    if (questionText.isNotBlank()) {
                        onSend(questionText)
                        questionText = ""
                    }
                },
            ) {
                Icon(
                    imageVector = Icons.AutoMirrored.Filled.Send,
                    contentDescription = bayitString("player.dialogue.send"),
                    tint = DesignTokens.Colors.Primary.light,
                    modifier = Modifier.size(DesignTokens.Spacing.xl),
                )
            }
        }
    }
}
