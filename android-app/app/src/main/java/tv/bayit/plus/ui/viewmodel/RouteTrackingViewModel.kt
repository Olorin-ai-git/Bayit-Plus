package tv.bayit.plus.ui.viewmodel

import androidx.lifecycle.ViewModel
import dagger.hilt.android.lifecycle.HiltViewModel
import tv.bayit.plus.core.auth.OlorinAuthService
import tv.bayit.plus.navigation.LastVisitedRouteManager
import tv.bayit.plus.navigation.Route
import javax.inject.Inject

/**
 * Bridges route-change events observed in [tv.bayit.plus.ui.BayitMainScaffold] to
 * [LastVisitedRouteManager]. Exposes a single stateless [onRouteChanged] call so that the
 * composable does not need to hold DI-managed singletons directly.
 */
@HiltViewModel
class RouteTrackingViewModel @Inject constructor(
    private val lastVisitedRouteManager: LastVisitedRouteManager,
    private val authService: OlorinAuthService,
) : ViewModel() {

    /**
     * Persists [route] for the currently authenticated user. Silently no-ops when the user is
     * not authenticated or when [route] is not restorable (e.g. auth screens, player).
     */
    fun onRouteChanged(route: Route) {
        val userId = authService.currentUserId ?: return
        lastVisitedRouteManager.save(route, userId)
    }
}
