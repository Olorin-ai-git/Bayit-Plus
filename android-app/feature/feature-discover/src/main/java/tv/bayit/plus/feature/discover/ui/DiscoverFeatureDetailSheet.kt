package tv.bayit.plus.feature.discover.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Icon
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import tv.bayit.plus.designsystem.i18n.bayitString
import tv.bayit.plus.designsystem.theme.DesignTokens
import tv.bayit.plus.feature.discover.data.FeatureConfigDto
import tv.bayit.plus.feature.discover.model.DiscoverFeature
import tv.bayit.plus.feature.discover.model.FeatureAvailabilityState

@OptIn(ExperimentalMaterial3Api::class)
@Composable
internal fun DiscoverFeatureDetailSheet(
    feature: DiscoverFeature,
    availability: FeatureAvailabilityState,
    config: FeatureConfigDto?,
    onDismiss: () -> Unit,
    onStartWalkthrough: (DiscoverFeature) -> Unit,
    onNavigateToPlayer: (String, String) -> Unit,
    onNavigateToZehAni: () -> Unit,
) {
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
        containerColor = DesignTokens.Colors.Glass.bg,
    ) {
        FeatureDetailContent(
            feature = feature,
            availability = availability,
            config = config,
            onStartWalkthrough = onStartWalkthrough,
        )
    }
}

@Composable
private fun FeatureDetailContent(
    feature: DiscoverFeature,
    availability: FeatureAvailabilityState,
    config: FeatureConfigDto?,
    onStartWalkthrough: (DiscoverFeature) -> Unit,
) {
    val playerRoutes = setOf("player", "live_tv", "epg")
    val needsContentId = feature.deepLinkRoute in playerRoutes
    val hasWalkthroughContent = when {
        needsContentId -> config?.walkthroughContentId != null
        else -> feature.deepLinkRoute != null
    }

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(DesignTokens.Spacing.lg),
        verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md),
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md),
        ) {
            Icon(
                imageVector = discoverIcon(feature.iconName),
                contentDescription = null,
                tint = DesignTokens.Colors.Primary.light,
                modifier = Modifier.size(32.dp),
            )
            Column {
                Text(
                    text = bayitString(feature.nameKey),
                    style = MaterialTheme.typography.headlineSmall,
                    color = DesignTokens.Colors.Text.primary,
                )
                DiscoverAvailabilityBadge(state = availability)
            }
        }

        Text(
            text = bayitString(feature.descriptionKey),
            style = MaterialTheme.typography.bodyMedium,
            color = DesignTokens.Colors.Text.secondary,
        )

        if (availability is FeatureAvailabilityState.SetupNeeded) {
            PrerequisitesList(prerequisites = availability.missing)
        }

        Spacer(modifier = Modifier.height(DesignTokens.Spacing.md))

        if (config?.enabled != false && hasWalkthroughContent) {
            TextButton(
                onClick = { onStartWalkthrough(feature) },
                modifier = Modifier.fillMaxWidth(),
            ) {
                Text(
                    text = bayitString("discover.walkthrough.tryItNow"),
                    color = DesignTokens.Colors.Primary.light,
                )
            }
        }
    }
}
