package tv.bayit.plus.feature.vod.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import tv.bayit.plus.core.model.CollectionDetail
import tv.bayit.plus.designsystem.component.CachedAsyncImage
import tv.bayit.plus.designsystem.i18n.bayitString
import tv.bayit.plus.designsystem.theme.DesignTokens

@Composable
internal fun CollectionBannerRow(
    currentCollection: CollectionDetail,
    currentLanguage: String,
    collectionsSize: Int,
    onCollectionClick: (String) -> Unit,
    onWatchNowClick: (movieId: String) -> Unit,
    modifier: Modifier = Modifier,
) {
    Row(
        modifier = modifier
            .padding(
                start = DesignTokens.Spacing.md,
                end = DesignTokens.Spacing.md,
                top = DesignTokens.Spacing.md,
                bottom = if (collectionsSize > 1) DesignTokens.Spacing.xl else DesignTokens.Spacing.md,
            ),
        horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md),
    ) {
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
                contentScale = ContentScale.Crop,
            )
        }

        CollectionBannerTextContent(
            currentCollection = currentCollection,
            currentLanguage = currentLanguage,
            onCollectionClick = onCollectionClick,
            onWatchNowClick = onWatchNowClick,
            modifier = Modifier.weight(1f),
        )
    }
}

@Composable
internal fun CollectionBannerTextContent(
    currentCollection: CollectionDetail,
    currentLanguage: String,
    onCollectionClick: (String) -> Unit,
    onWatchNowClick: (movieId: String) -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier,
        verticalArrangement = Arrangement.Center,
    ) {
        Text(
            text = bayitString("vod.collection.aiRecommendation"),
            style = MaterialTheme.typography.labelSmall.copy(
                fontSize = 12.sp,
                fontWeight = FontWeight.SemiBold,
                letterSpacing = 0.5.sp,
            ),
            color = DesignTokens.Colors.Text.muted,
        )
        Spacer(modifier = Modifier.height(DesignTokens.Spacing.sm))
        Text(
            text = getLocalizedTitle(currentCollection, currentLanguage),
            style = MaterialTheme.typography.titleLarge.copy(
                fontSize = 20.sp,
                fontWeight = FontWeight.Bold,
            ),
            color = DesignTokens.Colors.Text.primary,
            maxLines = 2,
            overflow = TextOverflow.Ellipsis,
        )
        Spacer(modifier = Modifier.height(DesignTokens.Spacing.xs))
        Text(
            text = getLocalizedPromoText(currentCollection, currentLanguage),
            style = MaterialTheme.typography.bodyMedium.copy(
                fontSize = 14.sp,
                lineHeight = 20.sp,
            ),
            color = DesignTokens.Colors.Text.secondary,
            maxLines = 3,
            overflow = TextOverflow.Ellipsis,
        )
        Spacer(modifier = Modifier.height(DesignTokens.Spacing.xs))
        Text(
            text = bayitString("vod.collection.moviesCount", mapOf("count" to (currentCollection.availableMovies ?: 0).toString())),
            style = MaterialTheme.typography.bodySmall.copy(fontSize = 13.sp),
            color = DesignTokens.Colors.Text.muted,
        )
        Spacer(modifier = Modifier.height(DesignTokens.Spacing.sm))

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
                .padding(horizontal = DesignTokens.Spacing.md, vertical = DesignTokens.Spacing.sm),
        ) {
            Text(
                text = bayitString("common.watchNow"),
                style = MaterialTheme.typography.labelMedium.copy(
                    fontSize = 14.sp,
                    fontWeight = FontWeight.SemiBold,
                ),
                color = Color.White,
            )
        }
    }
}

internal fun getLocalizedTitle(collection: CollectionDetail, language: String): String =
    collection.title ?: ""

internal fun getLocalizedPromoText(collection: CollectionDetail, language: String): String =
    collection.localizedPromoText() ?: ""
