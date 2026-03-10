package tv.bayit.plus.feature.home

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.ui.res.painterResource
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import tv.bayit.plus.core.model.IsraeliBusinessesResponse
import tv.bayit.plus.core.model.IsraelisInCityResponse
import tv.bayit.plus.designsystem.component.GlassButton
import tv.bayit.plus.designsystem.component.GlassContentCard
import tv.bayit.plus.designsystem.i18n.bayitString
import tv.bayit.plus.designsystem.modifier.glassMorphism
import tv.bayit.plus.designsystem.theme.DesignTokens

@Composable
internal fun LocationContentRow(
    title: String,
    israelisResponse: IsraelisInCityResponse?,
    onItemClick: (String, String) -> Unit,
    onShowAllClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val content = israelisResponse?.content
    val newsArticles = content?.newsArticles.orEmpty()
    val communityEvents = content?.communityEvents.orEmpty()
    val allItems = newsArticles + communityEvents

    if (allItems.isEmpty()) return

    Column(modifier = modifier) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = DesignTokens.Spacing.lg),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween,
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = title,
                    style = MaterialTheme.typography.titleLarge,
                    color = DesignTokens.Colors.Text.primary,
                    fontWeight = FontWeight.Bold,
                )
                israelisResponse?.coverage?.let { coverage ->
                    Text(
                        text = coverage,
                        style = MaterialTheme.typography.bodySmall,
                        color = DesignTokens.Colors.Text.secondary,
                    )
                }
            }
            IconButton(onClick = onShowAllClick) {
                Icon(
                    painter = painterResource(android.R.drawable.ic_menu_more),
                    contentDescription = null,
                    tint = DesignTokens.Colors.Primary.p400,
                )
            }
        }
        Spacer(modifier = Modifier.height(DesignTokens.Spacing.md))
        LazyRow(
            contentPadding = PaddingValues(horizontal = DesignTokens.Spacing.lg),
            horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md),
        ) {
            items(
                items = allItems,
                key = { it.id },
            ) { item ->
                GlassContentCard(
                    imageUrl = item.thumbnail,
                    title = item.title,
                    onClick = { onItemClick(item.id, item.type.orEmpty()) },
                )
            }
        }
    }
}

@Composable
internal fun BusinessLocationRow(
    businessesResponse: IsraeliBusinessesResponse?,
    onItemClick: (String, String) -> Unit,
    onShowAllClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val content = businessesResponse?.content
    val businesses = content?.newsArticles.orEmpty()

    if (businesses.isEmpty()) return

    Column(modifier = modifier) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = DesignTokens.Spacing.lg),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween,
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = bayitString("home.israeliBusinessesNearYou"),
                    style = MaterialTheme.typography.titleLarge,
                    color = DesignTokens.Colors.Text.primary,
                    fontWeight = FontWeight.Bold,
                )
                businessesResponse?.coverage?.let { coverage ->
                    Text(
                        text = coverage,
                        style = MaterialTheme.typography.bodySmall,
                        color = DesignTokens.Colors.Text.secondary,
                    )
                }
            }
            IconButton(onClick = onShowAllClick) {
                Icon(
                    painter = painterResource(android.R.drawable.ic_menu_more),
                    contentDescription = null,
                    tint = DesignTokens.Colors.Primary.p400,
                )
            }
        }
        Spacer(modifier = Modifier.height(DesignTokens.Spacing.md))
        LazyRow(
            contentPadding = PaddingValues(horizontal = DesignTokens.Spacing.lg),
            horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md),
        ) {
            items(
                items = businesses,
                key = { it.id },
            ) { item ->
                GlassContentCard(
                    imageUrl = item.thumbnail,
                    title = item.title,
                    onClick = { onItemClick(item.id, item.type.orEmpty()) },
                )
            }
        }
    }
}

@Composable
internal fun LocationPermissionCard(
    isPermanentlyDenied: Boolean,
    onRequestPermission: () -> Unit,
    onOpenSettings: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .glassMorphism()
            .padding(DesignTokens.Spacing.lg),
        verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md),
    ) {
        Text(
            text = bayitString("home.nearYou"),
            style = MaterialTheme.typography.titleLarge,
            color = DesignTokens.Colors.Text.primary,
            fontWeight = FontWeight.Bold,
        )
        Text(
            text = if (isPermanentlyDenied)
                bayitString("home.locationPermissionDeniedDescription")
            else
                bayitString("home.locationPermissionDescription"),
            style = MaterialTheme.typography.bodyMedium,
            color = DesignTokens.Colors.Text.secondary,
        )
        GlassButton(
            text = if (isPermanentlyDenied)
                bayitString("home.openSettings")
            else
                bayitString("home.enableLocation"),
            onClick = if (isPermanentlyDenied) onOpenSettings else onRequestPermission,
            isPrimary = true,
        )
    }
}
