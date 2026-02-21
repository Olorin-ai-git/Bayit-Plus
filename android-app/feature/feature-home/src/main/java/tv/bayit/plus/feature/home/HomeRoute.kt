package tv.bayit.plus.feature.home

import android.Manifest
import android.content.Intent
import android.net.Uri
import android.provider.Settings
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import tv.bayit.plus.core.model.ContentItem
import tv.bayit.plus.core.model.SpotlightItem
import tv.bayit.plus.core.model.resolveContentType

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

    val context = LocalContext.current
    HomeScreen(
        uiState = uiState,
        onSpotlightClick = { item -> onNavigateToPlayer(item.id, item.type.orEmpty()) },
        onSpotlightMoreInfoClick = { item ->
            onNavigateToContent(item.id, resolveContentType(item))
        },
        onContentClick = { item ->
            val resolved = resolveContentType(item)
            val cat = item.category?.lowercase().orEmpty()
            when {
                resolved == "radio" || cat.contains("radio") -> onNavigateToRadioBrowse()
                resolved == "live" || cat.contains("live") -> onNavigateToLiveTV()
                else -> onNavigateToContent(item.id, resolved)
            }
        },
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
        onOpenUrl = { url -> context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url))) },
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
