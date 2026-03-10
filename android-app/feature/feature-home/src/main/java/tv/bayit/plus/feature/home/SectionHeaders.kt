package tv.bayit.plus.feature.home

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import tv.bayit.plus.designsystem.i18n.bayitString
import tv.bayit.plus.designsystem.theme.DesignTokens

@Composable
internal fun SectionRowHeader(
    title: String,
    modifier: Modifier = Modifier,
) {
    Text(
        text = title,
        style = MaterialTheme.typography.titleLarge,
        color = DesignTokens.Colors.Text.primary,
        fontWeight = FontWeight.Bold,
        modifier = modifier.padding(horizontal = DesignTokens.Spacing.lg),
    )
}

@Composable
internal fun SectionRowHeaderWithAction(
    title: String,
    onShowAllClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = DesignTokens.Spacing.lg),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween,
    ) {
        Text(
            text = title,
            style = MaterialTheme.typography.titleLarge,
            color = DesignTokens.Colors.Text.primary,
            fontWeight = FontWeight.Bold,
        )
        IconButton(onClick = onShowAllClick) {
            Icon(
                painter = painterResource(id = android.R.drawable.ic_menu_more),
                contentDescription = bayitString("home.sectionShowAll", mapOf("title" to title)),
                tint = DesignTokens.Colors.Primary.p400,
            )
        }
    }
}
