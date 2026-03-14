package tv.bayit.plus.feature.discover.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Icon
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.testTag
import androidx.compose.ui.unit.dp
import tv.bayit.plus.designsystem.component.CachedAsyncImage
import tv.bayit.plus.designsystem.component.GlassButton
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
    onWatchDemo: (String) -> Unit,
    onNavigateToFixRoute: (String) -> Unit,
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
            onWatchDemo = onWatchDemo,
            onNavigateToFixRoute = onNavigateToFixRoute,
        )
    }
}

@Composable
private fun FeatureDetailContent(
    feature: DiscoverFeature,
    availability: FeatureAvailabilityState,
    config: FeatureConfigDto?,
    onStartWalkthrough: (DiscoverFeature) -> Unit,
    onWatchDemo: (String) -> Unit,
    onNavigateToFixRoute: (String) -> Unit,
) {
    val needsContentId = feature.deepLinkRoute == "player"
    val hasWalkthroughContent = when {
        needsContentId -> config?.walkthroughContentId != null
        else -> feature.deepLinkRoute != null
    }
    val hasDemoVideo = config?.demoVideoUrl != null
    val hasThumbnail = config?.demoThumbnailUrl != null

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .verticalScroll(rememberScrollState())
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
            text = bayitString(feature.taglineKey),
            style = MaterialTheme.typography.titleSmall,
            color = DesignTokens.Colors.Primary.light,
        )

        Text(
            text = bayitString(feature.descriptionKey),
            style = MaterialTheme.typography.bodyMedium,
            color = DesignTokens.Colors.Text.secondary,
        )

        if (availability is FeatureAvailabilityState.SetupNeeded) {
            PrerequisitesList(
                prerequisites = availability.missing,
                onFixPrerequisite = onNavigateToFixRoute,
            )
        }

        if (hasThumbnail) {
            CachedAsyncImage(
                url = config!!.demoThumbnailUrl,
                contentDescription = bayitString(feature.nameKey),
                modifier = Modifier
                    .fillMaxWidth()
                    .aspectRatio(16f / 9f)
                    .clip(RoundedCornerShape(DesignTokens.Radius.default)),
                contentScale = ContentScale.Crop,
            )
        }

        Spacer(modifier = Modifier.height(DesignTokens.Spacing.sm))

        if (config?.enabled != false && hasWalkthroughContent) {
            GlassButton(
                text = bayitString("discover.walkthrough.tryItNow"),
                onClick = { onStartWalkthrough(feature) },
                isPrimary = true,
                modifier = Modifier
                    .fillMaxWidth()
                    .semantics { testTag = "discover_action_tryIt" },
            )
        }

        if (hasDemoVideo) {
            GlassButton(
                text = bayitString("discover.walkthrough.watchDemo"),
                onClick = { onWatchDemo(config!!.demoVideoUrl!!) },
                isPrimary = false,
                modifier = Modifier
                    .fillMaxWidth()
                    .semantics { testTag = "discover_action_watchDemo" },
            )
        }
    }
}
