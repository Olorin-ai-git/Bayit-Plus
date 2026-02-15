package tv.bayit.plus.ui.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Language
import androidx.compose.material.icons.filled.Person
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import tv.bayit.plus.designsystem.modifier.glassMorphism
import tv.bayit.plus.designsystem.theme.DesignTokens

@Composable
fun TopAppBar(
    onProfileClick: () -> Unit,
    onLanguageClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .glassMorphism(
                cornerRadius = DesignTokens.Radius.sm,
                backgroundColor = DesignTokens.Colors.Glass.bgStrong,
            )
            .windowInsetsPadding(WindowInsets.statusBars),
    ) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .height(52.dp)
            .padding(horizontal = DesignTokens.Spacing.sm),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween,
    ) {
        IconButton(onClick = onProfileClick) {
            Icon(
                imageVector = Icons.Default.Person,
                contentDescription = "Profile",
                tint = DesignTokens.Colors.Text.primary,
                modifier = Modifier.size(28.dp),
            )
        }

        Spacer(modifier = Modifier.weight(1f))

        IconButton(onClick = onLanguageClick) {
            Icon(
                imageVector = Icons.Default.Language,
                contentDescription = "Language",
                tint = DesignTokens.Colors.Text.primary,
                modifier = Modifier.size(28.dp),
            )
        }
    }
    }
}
