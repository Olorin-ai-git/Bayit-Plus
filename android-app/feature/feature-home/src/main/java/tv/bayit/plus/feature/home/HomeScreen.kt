package tv.bayit.plus.feature.home

import android.Manifest
import android.content.Intent
import android.net.Uri
import android.provider.Settings
import androidx.compose.ui.platform.LocalContext
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import tv.bayit.plus.core.model.ContentItem
import tv.bayit.plus.core.model.SpotlightItem
import tv.bayit.plus.designsystem.component.GlassButton
import tv.bayit.plus.designsystem.component.GlassLoadingIndicator
import tv.bayit.plus.designsystem.i18n.bayitString
import tv.bayit.plus.designsystem.theme.DesignTokens

@Composable
fun HomeRoute(
    onNavigateToContent: (String, String) -> Unit,
    onNavigateToPlayer: (String, String) -> Unit,
    onNavigateToContinueWatchingItem: (String, String, Long) -> Unit,
    onNavigateToChannel: (String) -> Unit,
    onNavigateToRadio: (String) -> Unit,
    onNavigateToYoungsters: () -> Unit,
    onNavigateToJerusalem: () -> Unit,
    onNavigateToTelAviv: () -> Unit,
    onNavigateToContinueWatchingAll: () -> Unit,
    onNavigateToLiveTV: () -> Unit,
    onNavigateToRadioBrowse: () -> Unit,
    onNavigateToTrending: () -> Unit,
    onNavigateToCategoryBrowse: (String) -> Unit,
    onNavigateToIsraelisCity: () -> Unit,
    onNavigateToIsraeliBusinesses: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: HomeViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val activity = LocalContext.current as? android.app.Activity
    val lifecycleOwner = LocalLifecycleOwner.current

    // Re-check permission when returning from the Settings screen
    DisposableEffect(lifecycleOwner) {
        val observer = LifecycleEventObserver { _, event ->
            if (event == Lifecycle.Event.ON_RESUME) viewModel.recheckLocationPermission()
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose { lifecycleOwner.lifecycle.removeObserver(observer) }
    }

    val locationPermissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestPermission(),
    ) { isGranted ->
        if (isGranted) viewModel.onLocationPermissionGranted() else viewModel.onLocationPermissionDenied()
    }

    // Permanently denied = was requested before AND system no longer shows rationale
    val successState = uiState as? HomeUiState.Success
    val isPermanentlyDenied = successState?.locationPermissionNeeded == true &&
        successState.locationPermissionPreviouslyDenied &&
        activity?.shouldShowRequestPermissionRationale(Manifest.permission.ACCESS_COARSE_LOCATION) == false

    HomeScreen(
        uiState = uiState,
        onSpotlightClick = { item -> onNavigateToPlayer(item.id, item.type.orEmpty()) },
        onContentClick = { item -> onNavigateToContent(item.id, item.type.orEmpty()) },
        onContinueWatchingItemClick = onNavigateToContinueWatchingItem,
        onCollectionClick = { id -> onNavigateToContent(id, "collection") },
        onWatchNowClick = { movieId -> onNavigateToPlayer(movieId, "movie") },
        onChannelClick = onNavigateToChannel,
        onRadioClick = onNavigateToRadio,
        onYoungstersClick = onNavigateToYoungsters,
        onJerusalemClick = onNavigateToJerusalem,
        onTelAvivClick = onNavigateToTelAviv,
        onContinueWatchingShowAll = onNavigateToContinueWatchingAll,
        onLiveTVShowAll = onNavigateToLiveTV,
        onRadioShowAll = onNavigateToRadioBrowse,
        onTrendingShowAll = onNavigateToTrending,
        onCategoryShowAll = onNavigateToCategoryBrowse,
        onIsraelisCityShowAll = onNavigateToIsraelisCity,
        onIsraeliBusinessesShowAll = onNavigateToIsraeliBusinesses,
        isLocationPermissionPermanentlyDenied = isPermanentlyDenied,
        onRequestLocationPermission = {
            viewModel.markLocationPermissionRequested()
            locationPermissionLauncher.launch(Manifest.permission.ACCESS_COARSE_LOCATION)
        },
        onOpenLocationSettings = {
            val intent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                data = Uri.fromParts("package", activity?.packageName.orEmpty(), null)
            }
            activity?.startActivity(intent)
        },
        onRefresh = viewModel::refresh,
        onDismissShabbatBanner = viewModel::dismissShabbatBanner,
        modifier = modifier,
    )
}

@Composable
internal fun HomeScreen(
    uiState: HomeUiState,
    onSpotlightClick: (SpotlightItem) -> Unit,
    onContentClick: (ContentItem) -> Unit,
    onContinueWatchingItemClick: (String, String, Long) -> Unit,
    onCollectionClick: (String) -> Unit,
    onWatchNowClick: (String) -> Unit,
    onChannelClick: (String) -> Unit,
    onRadioClick: (String) -> Unit,
    onYoungstersClick: () -> Unit,
    onJerusalemClick: () -> Unit,
    onTelAvivClick: () -> Unit,
    onContinueWatchingShowAll: () -> Unit,
    onLiveTVShowAll: () -> Unit,
    onRadioShowAll: () -> Unit,
    onTrendingShowAll: () -> Unit,
    onCategoryShowAll: (String) -> Unit,
    onIsraelisCityShowAll: () -> Unit,
    onIsraeliBusinessesShowAll: () -> Unit,
    isLocationPermissionPermanentlyDenied: Boolean,
    onRequestLocationPermission: () -> Unit,
    onOpenLocationSettings: () -> Unit,
    onRefresh: () -> Unit,
    onDismissShabbatBanner: () -> Unit = {},
    modifier: Modifier = Modifier,
) {
    when (uiState) {
        is HomeUiState.Loading -> GlassLoadingIndicator(modifier = modifier)
        is HomeUiState.Success -> HomeSuccessContent(
            uiState = uiState,
            onSpotlightClick = onSpotlightClick,
            onContentClick = onContentClick,
            onContinueWatchingItemClick = onContinueWatchingItemClick,
            onCollectionClick = onCollectionClick,
            onWatchNowClick = onWatchNowClick,
            onChannelClick = onChannelClick,
            onRadioClick = onRadioClick,
            onYoungstersClick = onYoungstersClick,
            onJerusalemClick = onJerusalemClick,
            onTelAvivClick = onTelAvivClick,
            onContinueWatchingShowAll = onContinueWatchingShowAll,
            onLiveTVShowAll = onLiveTVShowAll,
            onRadioShowAll = onRadioShowAll,
            onTrendingShowAll = onTrendingShowAll,
            onCategoryShowAll = onCategoryShowAll,
            onIsraelisCityShowAll = onIsraelisCityShowAll,
            onIsraeliBusinessesShowAll = onIsraeliBusinessesShowAll,
            isLocationPermissionPermanentlyDenied = isLocationPermissionPermanentlyDenied,
            onRequestLocationPermission = onRequestLocationPermission,
            onOpenLocationSettings = onOpenLocationSettings,
            onRefresh = onRefresh,
            onDismissShabbatBanner = onDismissShabbatBanner,
            modifier = modifier,
        )
        is HomeUiState.Error -> ErrorSection(
            message = uiState.message,
            onRetry = onRefresh,
            modifier = modifier,
        )
    }
}

@Composable
private fun ErrorSection(
    message: String,
    onRetry: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Box(modifier = modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md),
        ) {
            Text(
                text = message,
                style = MaterialTheme.typography.bodyLarge,
                color = DesignTokens.Colors.Semantic.error,
            )
            GlassButton(text = bayitString("common.retry"), onClick = onRetry)
        }
    }
}
