package tv.bayit.plus.designsystem.component

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AccountCircle
import androidx.compose.material.icons.filled.Language
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import tv.bayit.plus.designsystem.theme.DesignTokens

/**
 * Profile avatar component for the top navigation bar.
 * Displays the user's profile photo or a person icon fallback.
 */
@Composable
fun ProfileAvatar(
    photoUrl: String?,
    userName: String?,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Box(
        modifier = modifier
            .size(32.dp)
            .clip(CircleShape)
            .background(DesignTokens.Colors.Glass.bgStrong, CircleShape)
            .border(1.dp, DesignTokens.Colors.Glass.border, CircleShape)
            .clickable(onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        if (photoUrl != null) {
            CachedAsyncImage(
                url = photoUrl,
                contentDescription = userName ?: "Profile",
                contentScale = ContentScale.Crop,
                modifier = Modifier
                    .size(32.dp)
                    .clip(CircleShape),
            )
        } else {
            Icon(
                imageVector = Icons.Default.AccountCircle,
                contentDescription = userName ?: "Profile",
                tint = DesignTokens.Colors.Text.secondary,
                modifier = Modifier.size(24.dp),
            )
        }
    }
}

/**
 * Language selector dropdown for the top navigation bar.
 * Shows the current language code and allows switching between all 10 supported languages.
 */
@Composable
fun LanguageSelector(
    currentLanguage: String,
    onLanguageSelected: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    var expanded by remember { mutableStateOf(false) }

    val languages = listOf(
        "en" to "English",
        "he" to "עברית",
        "es" to "Español",
        "fr" to "Français",
        "ru" to "Русский",
        "pt" to "Português",
        "yi" to "ייִדיש",
        "ar" to "العربية",
        "de" to "Deutsch",
        "it" to "Italiano",
    )

    Box(modifier = modifier) {
        Row(
            modifier = Modifier
                .clip(androidx.compose.foundation.shape.RoundedCornerShape(DesignTokens.Radius.full))
                .background(DesignTokens.Colors.Glass.bg)
                .border(
                    1.dp,
                    DesignTokens.Colors.Glass.border,
                    androidx.compose.foundation.shape.RoundedCornerShape(DesignTokens.Radius.full),
                )
                .clickable { expanded = true }
                .padding(
                    horizontal = DesignTokens.Spacing.sm,
                    vertical = DesignTokens.Spacing.xs,
                ),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(
                imageVector = Icons.Default.Language,
                contentDescription = "Select language",
                tint = DesignTokens.Colors.Text.secondary,
                modifier = Modifier.size(16.dp),
            )
            Spacer(modifier = Modifier.width(4.dp))
            Text(
                text = currentLanguage.uppercase(),
                style = MaterialTheme.typography.labelMedium,
                color = DesignTokens.Colors.Text.primary,
                fontWeight = FontWeight.SemiBold,
            )
        }

        DropdownMenu(
            expanded = expanded,
            onDismissRequest = { expanded = false },
            modifier = Modifier.background(DesignTokens.Colors.Glass.bgStrong),
        ) {
            languages.forEach { (code, name) ->
                DropdownMenuItem(
                    text = {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(
                                text = code.uppercase(),
                                style = MaterialTheme.typography.labelSmall,
                                color = if (code == currentLanguage)
                                    DesignTokens.Colors.Primary.base
                                else
                                    DesignTokens.Colors.Text.secondary,
                                fontWeight = if (code == currentLanguage)
                                    FontWeight.Bold
                                else
                                    FontWeight.Normal,
                                modifier = Modifier.width(32.dp),
                            )
                            Spacer(modifier = Modifier.width(DesignTokens.Spacing.sm))
                            Text(
                                text = name,
                                style = MaterialTheme.typography.bodyMedium,
                                color = if (code == currentLanguage)
                                    DesignTokens.Colors.Text.primary
                                else
                                    DesignTokens.Colors.Text.secondary,
                            )
                        }
                    },
                    onClick = {
                        onLanguageSelected(code)
                        expanded = false
                    },
                )
            }
        }
    }
}
