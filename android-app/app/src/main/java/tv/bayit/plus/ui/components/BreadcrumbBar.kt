package tv.bayit.plus.ui.components

import android.annotation.SuppressLint
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.navigation.NavHostController
import tv.bayit.plus.designsystem.i18n.bayitString
import tv.bayit.plus.designsystem.theme.DesignTokens
import tv.bayit.plus.navigation.BreadcrumbEntry
import tv.bayit.plus.navigation.isTabRootPattern
import tv.bayit.plus.navigation.routeLabelFromPattern

@Composable
fun BreadcrumbRow(
    entries: List<BreadcrumbEntry>,
    onEntryClick: (BreadcrumbEntry) -> Unit,
    showBack: Boolean = false,
    onBack: () -> Unit = {},
    modifier: Modifier = Modifier,
) {
    if (entries.isEmpty() && !showBack) return

    Row(
        modifier = modifier
            .fillMaxWidth()
            .horizontalScroll(rememberScrollState())
            .padding(
                start = if (showBack) DesignTokens.Spacing.xs else DesignTokens.Spacing.md,
                end = DesignTokens.Spacing.md,
                top = DesignTokens.Spacing.xs,
                bottom = DesignTokens.Spacing.xs,
            ),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.xs),
    ) {
        if (showBack) {
            IconButton(onClick = onBack, modifier = Modifier.size(32.dp)) {
                Icon(
                    imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                    contentDescription = bayitString("common.back"),
                    tint = DesignTokens.Colors.Text.primary,
                    modifier = Modifier.size(20.dp),
                )
            }
        }
        entries.forEachIndexed { index, entry ->
            val isLast = index == entries.lastIndex
            BreadcrumbItem(
                label = entry.label,
                isActive = isLast,
                onClick = if (isLast) null else { { onEntryClick(entry) } },
            )
            if (!isLast) {
                Icon(
                    imageVector = Icons.AutoMirrored.Filled.KeyboardArrowRight,
                    contentDescription = null,
                    tint = DesignTokens.Colors.Text.muted,
                    modifier = Modifier.size(16.dp),
                )
            }
        }
    }
}

@Composable
private fun BreadcrumbItem(
    label: String,
    isActive: Boolean,
    onClick: (() -> Unit)?,
    modifier: Modifier = Modifier,
) {
    val shape = RoundedCornerShape(DesignTokens.Radius.default)
    val semanticLabel = if (isActive) {
        bayitString("navigation.currentScreen", mapOf("label" to label))
    } else {
        bayitString("navigation.navigateTo", mapOf("label" to label))
    }
    Text(
        text = label,
        color = if (isActive) {
            DesignTokens.Colors.Text.primary
        } else {
            DesignTokens.Colors.Primary.p400
        },
        fontSize = DesignTokens.FontSize.sm,
        fontWeight = if (isActive) FontWeight.SemiBold else FontWeight.Normal,
        maxLines = 1,
        modifier = modifier
            .clip(shape)
            .background(
                if (isActive) {
                    DesignTokens.Colors.Glass.purpleLight
                } else {
                    DesignTokens.Colors.Glass.bgLight
                },
                shape,
            )
            .then(
                if (onClick != null) {
                    Modifier.clickable(onClick = onClick)
                } else {
                    Modifier
                },
            )
            .padding(
                horizontal = DesignTokens.Spacing.sm,
                vertical = DesignTokens.Spacing.xs,
            )
            .semantics {
                contentDescription = semanticLabel
            },
    )
}

@SuppressLint("RestrictedApi")
@Composable
fun rememberBreadcrumbTrail(
    navController: NavHostController,
): List<BreadcrumbEntry> {
    val backStack by navController.currentBackStack.collectAsState()

    return remember(backStack) {
        val screenEntries = backStack.filter { entry ->
            entry.destination.navigatorName == "composable"
        }

        if (screenEntries.isEmpty()) return@remember emptyList()

        val tabRootIndex = screenEntries.indexOfLast { entry ->
            val route = entry.destination.route ?: return@indexOfLast false
            isTabRootPattern(route)
        }

        if (tabRootIndex < 0) return@remember emptyList()

        val trailEntries = screenEntries.subList(tabRootIndex, screenEntries.size)

        trailEntries.mapIndexedNotNull { index, entry ->
            val route = entry.destination.route ?: return@mapIndexedNotNull null
            val label = routeLabelFromPattern(route) ?: return@mapIndexedNotNull null
            BreadcrumbEntry(
                label = label,
                popCount = trailEntries.lastIndex - index,
            )
        }
    }
}
