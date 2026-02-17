package tv.bayit.plus.feature.vod.components

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import tv.bayit.plus.core.model.CollectionDetail
import tv.bayit.plus.designsystem.component.CachedAsyncImage
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
 * @param onCollectionClick Callback when user taps the card body — navigates to collection detail
 * @param onWatchNowClick Callback when user taps "Watch Now" — plays the first movie in the collection
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
) {
    if (collections.isEmpty()) return

    var currentIndex by remember { mutableIntStateOf(0) }
    val alpha = remember { Animatable(1f) }
    val scope = rememberCoroutineScope()

    val currentCollection = collections[currentIndex]

    // Auto-rotation effect
    LaunchedEffect(autoRotate, collections.size) {
        if (!autoRotate || collections.size <= 1) return@LaunchedEffect

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
                shape = RoundedCornerShape(DesignTokens.Radius.lg)
            )
            .clickable { onCollectionClick(currentCollection.id) }
            .alpha(alpha.value)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(
                    start = DesignTokens.Spacing.md,
                    end = DesignTokens.Spacing.md,
                    top = DesignTokens.Spacing.md,
                    bottom = if (collections.size > 1) DesignTokens.Spacing.xl else DesignTokens.Spacing.md,
                )
                .align(Alignment.TopStart),
            horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md)
        ) {
            // Poster Image
            val posterUrl = currentCollection.thumbnail
                ?: currentCollection.backdrop
                ?: currentCollection.movies.firstOrNull()?.thumbnail
            if (posterUrl != null) {
                CachedAsyncImage(
                    url = posterUrl,
                    contentDescription = currentCollection.title,
                    modifier = Modifier
                        .width(100.dp)
                        .height(150.dp)
                        .clip(RoundedCornerShape(DesignTokens.Radius.md)),
                    contentScale = ContentScale.Crop
                )
            }

            // Text Content
            Column(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxHeight(),
                verticalArrangement = Arrangement.Center
            ) {
                // Header
                Text(
                    text = "AI RECOMMENDATION",
                    style = MaterialTheme.typography.labelSmall.copy(
                        fontSize = 12.sp,
                        fontWeight = FontWeight.SemiBold,
                        letterSpacing = 0.5.sp
                    ),
                    color = DesignTokens.Colors.Text.muted
                )

                Spacer(modifier = Modifier.height(DesignTokens.Spacing.sm))

                // Title
                Text(
                    text = getLocalizedTitle(currentCollection, currentLanguage),
                    style = MaterialTheme.typography.titleLarge.copy(
                        fontSize = 20.sp,
                        fontWeight = FontWeight.Bold
                    ),
                    color = DesignTokens.Colors.Text.primary,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )

                Spacer(modifier = Modifier.height(DesignTokens.Spacing.xs))

                // Promo Text
                Text(
                    text = getLocalizedPromoText(currentCollection, currentLanguage),
                    style = MaterialTheme.typography.bodyMedium.copy(
                        fontSize = 14.sp,
                        lineHeight = 20.sp
                    ),
                    color = DesignTokens.Colors.Text.secondary,
                    maxLines = 3,
                    overflow = TextOverflow.Ellipsis
                )

                Spacer(modifier = Modifier.height(DesignTokens.Spacing.xs))

                // Movie Count
                Text(
                    text = "${currentCollection.availableMovies ?: 0} Movies",
                    style = MaterialTheme.typography.bodySmall.copy(fontSize = 13.sp),
                    color = DesignTokens.Colors.Text.muted
                )

                Spacer(modifier = Modifier.height(DesignTokens.Spacing.sm))

                // CTA Button — tapping this plays the first movie directly
                val firstMovieId = currentCollection.movies.firstOrNull()?.id
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(24.dp))
                        .background(DesignTokens.Colors.Primary.base)
                        .clickable {
                            if (firstMovieId != null) {
                                onWatchNowClick(firstMovieId)
                            } else {
                                onCollectionClick(currentCollection.id)
                            }
                        }
                        .padding(horizontal = DesignTokens.Spacing.md, vertical = DesignTokens.Spacing.sm)
                ) {
                    Text(
                        text = "Watch Now",
                        style = MaterialTheme.typography.labelMedium.copy(
                            fontSize = 14.sp,
                            fontWeight = FontWeight.SemiBold
                        ),
                        color = Color.White
                    )
                }
            }
        }

        // Pagination dots at bottom center
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
                                    DesignTokens.Colors.Text.muted.copy(alpha = 0.3f)
                            )
                    )
                }
            }
        }
    }
}

private fun getLocalizedTitle(collection: CollectionDetail, language: String): String =
    collection.title ?: ""

private fun getLocalizedPromoText(collection: CollectionDetail, language: String): String =
    collection.localizedPromoText() ?: ""
