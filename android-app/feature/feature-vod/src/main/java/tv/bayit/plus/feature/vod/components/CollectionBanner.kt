package tv.bayit.plus.feature.vod.components

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.Icon
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import tv.bayit.plus.core.model.CollectionDetail
import tv.bayit.plus.designsystem.i18n.bayitString
import tv.bayit.plus.designsystem.theme.DesignTokens

/**
 * CollectionBanner - Rotating collection promotional banner for Android
 *
 * Features:
 * - Auto-rotation through collections every 5 seconds
 * - Smooth fade transitions with Compose animations
 * - Pagination indicators
 * - Multi-language promo text support
 *
 * @param collections List of collections to rotate through
 * @param onCollectionClick Callback when user taps the card body
 * @param onWatchNowClick Callback when user taps "Watch Now"
 * @param currentLanguage Current UI language code (e.g., "en", "he", "es")
 * @param modifier Modifier for styling
 * @param autoRotate Whether to automatically rotate collections
 * @param rotationIntervalMs Rotation interval in milliseconds
 */
@Composable
fun CollectionBanner(
    collections: List<CollectionDetail>,
    onCollectionClick: (String) -> Unit,
    onWatchNowClick: (movieId: String) -> Unit,
    currentLanguage: String,
    modifier: Modifier = Modifier,
    autoRotate: Boolean = true,
    rotationIntervalMs: Long = 5000L,
    onDismiss: (() -> Unit)? = null,
) {
    if (collections.isEmpty()) return

    var currentIndex by remember { mutableIntStateOf(0) }
    val alpha = remember { Animatable(1f) }
    val scope = rememberCoroutineScope()
    var isDismissing by remember { mutableStateOf(false) }

    val currentCollection = collections[currentIndex]

    LaunchedEffect(autoRotate, collections.size, isDismissing) {
        if (!autoRotate || collections.size <= 1 || isDismissing) return@LaunchedEffect
        while (true) {
            delay(rotationIntervalMs)
            alpha.animateTo(0f, animationSpec = tween(durationMillis = 300))
            currentIndex = (currentIndex + 1) % collections.size
            alpha.animateTo(1f, animationSpec = tween(durationMillis = 300))
        }
    }

    Box(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = DesignTokens.Spacing.lg, vertical = DesignTokens.Spacing.md)
            .clip(RoundedCornerShape(DesignTokens.Radius.lg))
            .background(DesignTokens.Colors.Glass.bgMedium)
            .border(
                width = 1.dp,
                color = DesignTokens.Colors.Glass.border,
                shape = RoundedCornerShape(DesignTokens.Radius.lg),
            )
            .clickable { onCollectionClick(currentCollection.id) }
            .alpha(alpha.value),
    ) {
        CollectionBannerRow(
            currentCollection = currentCollection,
            currentLanguage = currentLanguage,
            collectionsSize = collections.size,
            onCollectionClick = onCollectionClick,
            onWatchNowClick = onWatchNowClick,
            modifier = Modifier.fillMaxWidth().align(Alignment.TopStart),
        )

        if (onDismiss != null) {
            Box(
                modifier = Modifier
                    .align(Alignment.TopEnd)
                    .padding(DesignTokens.Spacing.sm)
                    .size(28.dp)
                    .clip(CircleShape)
                    .background(DesignTokens.Colors.Glass.bgStrong)
                    .clickable {
                        if (!isDismissing) {
                            isDismissing = true
                            scope.launch {
                                alpha.animateTo(0f, animationSpec = tween(durationMillis = 400))
                                onDismiss()
                            }
                        }
                    },
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    imageVector = Icons.Default.Close,
                    contentDescription = bayitString("vod.collection.dismissBanner"),
                    tint = DesignTokens.Colors.Text.secondary,
                    modifier = Modifier.size(16.dp),
                )
            }
        }

        if (collections.size > 1) {
            Row(
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .padding(bottom = DesignTokens.Spacing.sm),
                horizontalArrangement = Arrangement.spacedBy(4.dp),
            ) {
                collections.indices.forEach { index ->
                    Box(
                        modifier = Modifier
                            .size(6.dp)
                            .clip(CircleShape)
                            .background(
                                if (index == currentIndex)
                                    DesignTokens.Colors.Text.primary
                                else
                                    DesignTokens.Colors.Text.muted.copy(alpha = 0.3f),
                            ),
                    )
                }
            }
        }
    }
}
