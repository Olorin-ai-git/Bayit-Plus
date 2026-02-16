package tv.bayit.plus.feature.player.live.ui

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import tv.bayit.plus.designsystem.i18n.bayitString
import tv.bayit.plus.designsystem.theme.DesignTokens
import tv.bayit.plus.feature.player.live.LiveAIConfig

/**
 * Language picker modal for AI features
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AILanguagePicker(
    selectedLanguage: String,
    onLanguageSelected: (String) -> Unit,
    onDismiss: () -> Unit,
    modifier: Modifier = Modifier
) {
    ModalBottomSheet(
        onDismissRequest = onDismiss,
        modifier = modifier
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = 16.dp)
        ) {
            Text(
                text = bayitString("player.ai.selectLanguage"),
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.padding(horizontal = 24.dp, vertical = 8.dp)
            )

            LazyColumn(
                modifier = Modifier.fillMaxWidth()
            ) {
                items(LiveAIConfig.SUPPORTED_LANGUAGES) { (code, name) ->
                    LanguageItem(
                        languageCode = code,
                        languageName = name,
                        isSelected = code == selectedLanguage,
                        onClick = {
                            onLanguageSelected(code)
                        }
                    )
                }
            }
        }
    }
}

@Composable
private fun LanguageItem(
    languageCode: String,
    languageName: String,
    isSelected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val selectedLabel = bayitString("player.controls.selected")
    val selectLanguageLabel = bayitString("player.ai.selectLanguage")
    val accessibilityLabel = if (isSelected) {
        "$languageName, $selectedLabel"
    } else {
        "$selectLanguageLabel $languageName"
    }

    Row(
        modifier = modifier
            .fillMaxWidth()
            .height(DesignTokens.TouchTarget.minimum)
            .clickable(onClick = onClick)
            .semantics {
                contentDescription = accessibilityLabel
            }
            .padding(horizontal = DesignTokens.Spacing.xl, vertical = DesignTokens.Spacing.base),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = LiveAIConfig.getLanguageCode(languageCode),
                style = MaterialTheme.typography.headlineSmall,
                color = MaterialTheme.colorScheme.primary
            )
            Spacer(modifier = Modifier.width(DesignTokens.Spacing.base))
            Text(
                text = languageName,
                style = MaterialTheme.typography.bodyLarge,
                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal
            )
        }

        if (isSelected) {
            Icon(
                imageVector = Icons.Default.Check,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.primary
            )
        }
    }
}
