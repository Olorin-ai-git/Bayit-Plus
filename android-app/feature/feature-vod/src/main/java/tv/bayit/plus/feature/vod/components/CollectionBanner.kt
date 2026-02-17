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
import coil.compose.AsyncImage
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import tv.bayit.plus.designsystem.theme.DesignTokens

/**
 * Collection data model matching backend API response
 */
data class Collection(
    val id: String,
    val title: String,
    val titleEn: String? = null,
    val thumbnail: String? = null,
    val backdrop: String? = null,
    val promoText: String? = null,
    val promoTextEn: String? = null,
    val promoTextEs: String? = null,
    val promoTextFr: String? = null,
    val promoTextIt: String? = null,
    val promoTextHi: String? = null,
    val promoTextTa: String? = null,
    val promoTextBn: String? = null,
    val promoTextJa: String? = null,
    val promoTextZh: String? = null,
    val availableMovies: Int,
    val totalMovies: Int,
)

/**
 * CollectionBanner - Rotating collection promotional banner for Android
 *
 * Features:
 * - Auto-rotation through collections every 5 seconds
 * - Smooth fade transitions with Compose animations
 * - Pause rotation on press
 * - Pagination indicators
 * - Multi-language promo text support
 *
 * @param collections List of collections to rotate through
 * @param onCollectionClick Callback when user clicks a collection
 * @param currentLanguage Current UI language code (e.g., "en", "he", "es")
 * @param modifier Modifier for styling
 * @param autoRotate Whether to automatically rotate collections
 * @param rotationIntervalMs Rotation interval in milliseconds
 */
@Composable
fun CollectionBanner(
    collections: List<Collection>,
    onCollectionClick: (String) -> Unit,
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
    LaunchedEffect(autoRotate, collections.size, currentIndex) {
        if (!autoRotate || collections.size <= 1) return@LaunchedEffect

        delay(rotationIntervalMs)

        // Fade out
        alpha.animateTo(0f, animationSpec = tween(durationMillis = 300))

        // Change content
        currentIndex = (currentIndex + 1) % collections.size

        // Fade in
        alpha.animateTo(1f, animationSpec = tween(durationMillis = 300))
    }

    Box(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = DesignTokens.Spacing.lg, vertical = DesignTokens.Spacing.md)
            .clip(RoundedCornerShape(DesignTokens.Radius.lg))
            .background(DesignTokens.Glass.bgMedium)
            .border(
                width = 1.dp,
                color = DesignTokens.Glass.border,
                shape = RoundedCornerShape(DesignTokens.Radius.lg)
            )
            .clickable { onCollectionClick(currentCollection.id) }
            .alpha(alpha.value)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(DesignTokens.Spacing.md),
            horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md)
        ) {
            // Poster Image
            val posterUrl = currentCollection.thumbnail ?: currentCollection.backdrop
            if (posterUrl != null) {
                AsyncImage(
                    model = posterUrl,
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
                // Header with pagination
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "AI RECOMMENDATION",
                        style = MaterialTheme.typography.labelSmall.copy(
                            fontSize = 12.sp,
                            fontWeight = FontWeight.SemiBold,
                            letterSpacing = 0.5.sp
                        ),
                        color = DesignTokens.Text.muted
                    )

                    // Pagination dots
                    if (collections.size > 1) {
                        Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                            collections.indices.forEach { index ->
                                Box(
                                    modifier = Modifier
                                        .size(6.dp)
                                        .clip(CircleShape)
                                        .background(
                                            if (index == currentIndex)
                                                DesignTokens.Text.primary
                                            else
                                                DesignTokens.Text.muted.copy(alpha = 0.3f)
                                        )
                                )
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.height(DesignTokens.Spacing.sm))

                // Title
                Text(
                    text = getLocalizedTitle(currentCollection, currentLanguage),
                    style = MaterialTheme.typography.titleLarge.copy(
                        fontSize = 20.sp,
                        fontWeight = FontWeight.Bold
                    ),
                    color = DesignTokens.Text.primary,
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
                    color = DesignTokens.Text.secondary,
                    maxLines = 3,
                    overflow = TextOverflow.Ellipsis
                )

                Spacer(modifier = Modifier.height(DesignTokens.Spacing.xs))

                // Movie Count
                Text(
                    text = "${currentCollection.availableMovies} Movies",
                    style = MaterialTheme.typography.bodySmall.copy(fontSize = 13.sp),
                    color = DesignTokens.Text.muted
                )

                Spacer(modifier = Modifier.height(DesignTokens.Spacing.sm))

                // CTA Button
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(24.dp))
                        .background(DesignTokens.Primary.default)
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
    }
}

/**
 * Get localized title for collection
 */
private fun getLocalizedTitle(collection: Collection, language: String): String {
    return when (language) {
        "en" -> collection.titleEn ?: collection.title
        else -> collection.title
    }
}

/**
 * Get localized promo text for collection
 */
private fun getLocalizedPromoText(collection: Collection, language: String): String {
    return when (language) {
        "he" -> collection.promoText ?: collection.promoTextEn ?: ""
        "en" -> collection.promoTextEn ?: collection.promoText ?: ""
        "es" -> collection.promoTextEs ?: collection.promoTextEn ?: ""
        "fr" -> collection.promoTextFr ?: collection.promoTextEn ?: ""
        "it" -> collection.promoTextIt ?: collection.promoTextEn ?: ""
        "hi" -> collection.promoTextHi ?: collection.promoTextEn ?: ""
        "ta" -> collection.promoTextTa ?: collection.promoTextEn ?: ""
        "bn" -> collection.promoTextBn ?: collection.promoTextEn ?: ""
        "ja" -> collection.promoTextJa ?: collection.promoTextEn ?: ""
        "zh" -> collection.promoTextZh ?: collection.promoTextEn ?: ""
        else -> collection.promoTextEn ?: collection.promoText ?: ""
    }
}
