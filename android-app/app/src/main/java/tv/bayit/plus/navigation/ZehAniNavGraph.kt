package tv.bayit.plus.navigation

import androidx.compose.ui.res.stringResource
import androidx.navigation.NavController
import androidx.navigation.NavGraphBuilder
import androidx.navigation.compose.composable
import tv.bayit.plus.feature.onboarding.R as OnboardingR
import tv.bayit.plus.feature.missions.MissionsDashboardRoute
import tv.bayit.plus.feature.missions.interactive.InteractiveMissionRoute
import tv.bayit.plus.feature.missions.story.StarStoryRoute
import tv.bayit.plus.feature.voice.avatar.AvatarOverlayRoute
import tv.bayit.plus.feature.zehani.ZehAniDashboardRoute
import tv.bayit.plus.feature.zehani.mesh.MeshAvatarRoute
import tv.bayit.plus.feature.zehani.mode.AvatarModeRoute
import tv.bayit.plus.feature.zehani.selfie.VideoSelfieRoute
import tv.bayit.plus.feature.zehani.wardrobe.AvatarWardrobeRoute
import tv.bayit.plus.feature.zehani.avatar.Avatar3DRoute
import tv.bayit.plus.feature.zehani.contacts.ContactsRoute
import tv.bayit.plus.feature.zehani.feedback.FeedbackInboxRoute
import tv.bayit.plus.feature.zehani.highlights.HighlightsRoute
import tv.bayit.plus.feature.zehani.mirror.MagicMirrorRoute
import tv.bayit.plus.feature.zehani.consent.BiometricConsentRoute
import tv.bayit.plus.feature.zehani.movieinteractions.MovieInteractionsRoute
import tv.bayit.plus.feature.zehani.movieinteractions.MovieCharactersRoute
import tv.bayit.plus.feature.zehani.settings.AvatarSettingsRoute
import tv.bayit.plus.feature.zehani.v2v.V2VPracticeRoute

fun NavGraphBuilder.zehAniNavGraph(navController: NavController) {
    composable<Route.ZehAni> {
        WithFeatureTooltip(featureKey = "zeh_ani", message = stringResource(OnboardingR.string.tooltip_zeh_ani)) {
        ZehAniDashboardRoute(
            onNavigateToMagicMirror = { profileId -> navController.navigate(Route.ZehAniMagicMirror(profileId = profileId)) },
            onNavigateToV2V = { profileId -> navController.navigate(Route.ZehAniV2V(avatarId = "", profileId = profileId)) },
            onNavigateToAvatar3D = { profileId -> navController.navigate(Route.ZehAniAvatar3D(profileId = profileId)) },
            onNavigateToMovieInteractions = { profileId -> navController.navigate(Route.ZehAniMovieInteractions(profileId = profileId)) },
            onNavigateToContacts = { profileId -> navController.navigate(Route.ZehAniContacts(profileId = profileId)) },
            onNavigateToFeedback = { profileId -> navController.navigate(Route.ZehAniFeedback(profileId = profileId)) },
            onNavigateToConsent = { profileId -> navController.navigate(Route.ZehAniConsent(profileId = profileId)) },
            onNavigateToChess = { navController.navigate(Route.Chess()) },
            onNavigateBack = { navController.popBackStack() },
        )
        }
    }
    composable<Route.ZehAniMagicMirror> {
        MagicMirrorRoute(
            onNavigateBack = { navController.popBackStack() },
            onCreateAvatar = { navController.navigate(Route.VideoSelfie) },
        )
    }
    composable<Route.ZehAniV2V> {
        V2VPracticeRoute(onNavigateBack = { navController.popBackStack() })
    }
    composable<Route.ZehAniAvatar3D> {
        Avatar3DRoute(onNavigateBack = { navController.popBackStack() })
    }
    composable<Route.ZehAniHighlights> {
        HighlightsRoute(onNavigateBack = { navController.popBackStack() })
    }
    composable<Route.ZehAniContacts> {
        ContactsRoute(onNavigateBack = { navController.popBackStack() })
    }
    composable<Route.ZehAniFeedback> {
        FeedbackInboxRoute(onNavigateBack = { navController.popBackStack() })
    }
    composable<Route.ZehAniAvatarSettings> {
        AvatarSettingsRoute(onNavigateBack = { navController.popBackStack() })
    }
    composable<Route.ZehAniMovieInteractions> {
        MovieInteractionsRoute(
            onNavigateToCharacters = { contentId ->
                // Characters sub-screen uses movie tag status route
            },
            onNavigateBack = { navController.popBackStack() },
        )
    }
    composable<Route.ZehAniConsent> {
        BiometricConsentRoute(onNavigateBack = { navController.popBackStack() })
    }
    composable<Route.AvatarMode> {
        AvatarModeRoute(onNavigateBack = { navController.popBackStack() })
    }
    composable<Route.AvatarWardrobe> {
        AvatarWardrobeRoute(onNavigateBack = { navController.popBackStack() })
    }
    composable<Route.MeshAvatar> {
        MeshAvatarRoute(onNavigateBack = { navController.popBackStack() })
    }
    composable<Route.VideoSelfie> {
        VideoSelfieRoute(onNavigateBack = { navController.popBackStack() })
    }
    composable<Route.V2VPractice> {
        V2VPracticeRoute(onNavigateBack = { navController.popBackStack() })
    }
    composable<Route.VoiceAvatar> {
        AvatarOverlayRoute(onNavigateBack = { navController.popBackStack() })
    }
    composable<Route.MissionsDashboard> {
        MissionsDashboardRoute(
            onNavigateToInteractiveMission = { missionId ->
                navController.navigate(Route.InteractiveMission(missionId = missionId))
            },
            onNavigateToStarStory = { navController.navigate(Route.StarStory) },
        )
    }
    composable<Route.InteractiveMission> {
        InteractiveMissionRoute(onNavigateBack = { navController.popBackStack() })
    }
    composable<Route.StarStory> {
        StarStoryRoute(onNavigateBack = { navController.popBackStack() })
    }
}
