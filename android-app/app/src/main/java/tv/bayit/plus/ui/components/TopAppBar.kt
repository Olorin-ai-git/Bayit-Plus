package tv.bayit.plus.ui.components

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Language
import androidx.compose.material.icons.filled.Person
import androidx.compose.material3.Icon
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
    Row(
        modifier = modifier
            .fillMaxWidth()
            .height(64.dp)
            .glassMorphism(
                cornerRadius = DesignTokens.Radius.sm,
                backgroundColor = DesignTokens.Colors.Glass.bgStrong,
            )
            .padding(horizontal = DesignTokens.Spacing.base),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween,
    ) {
        Icon(
            imageVector = Icons.Default.Person,
            contentDescription = "Profile",
            tint = DesignTokens.Colors.Text.primary,
            modifier = Modifier
                .size(32.dp)
                .clickable { onProfileClick() },
        )

        Spacer(modifier = Modifier.weight(1f))

        Icon(
            imageVector = Icons.Default.Language,
            contentDescription = "Language",
            tint = DesignTokens.Colors.Text.primary,
            modifier = Modifier
                .size(32.dp)
                .clickable { onLanguageClick() },
        )
    }
}
