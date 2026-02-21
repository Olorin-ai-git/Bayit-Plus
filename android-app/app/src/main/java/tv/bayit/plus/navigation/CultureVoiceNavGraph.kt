package tv.bayit.plus.navigation

import androidx.navigation.NavController
import androidx.navigation.NavGraphBuilder
import androidx.navigation.compose.composable
import tv.bayit.plus.feature.culture.CultureRoute
import tv.bayit.plus.feature.culture.jerusalem.JerusalemContentRoute
import tv.bayit.plus.feature.culture.shabbat.ShabbatModeRoute
import tv.bayit.plus.feature.culture.telaviv.TelAvivContentRoute
import tv.bayit.plus.feature.culture.flows.FlowsRoute
import tv.bayit.plus.feature.culture.glossary.GlossaryRoute
import tv.bayit.plus.feature.culture.glossary.detail.GlossaryDetailRoute
import tv.bayit.plus.feature.culture.judaism.JudaismRoute
import tv.bayit.plus.feature.culture.morning.MorningRitualRoute
import tv.bayit.plus.feature.kids.children.ChildrenRoute
import tv.bayit.plus.feature.kids.youngsters.YoungstersRoute
import tv.bayit.plus.feature.voice.chatbot.ChatbotRoute
import tv.bayit.plus.feature.voice.onboarding.AIOnboardingRoute
import tv.bayit.plus.feature.voice.onboarding.VoiceOnboardingRoute
import tv.bayit.plus.feature.voice.search.VoiceSearchRoute
import tv.bayit.plus.feature.voice.settings.VoiceSettingsRoute
import tv.bayit.plus.feature.voice.talkback.TalkBackRoute
import tv.bayit.plus.feature.voice.wizard.VoiceWizardRoute

fun NavGraphBuilder.cultureVoiceNavGraph(navController: NavController) {
    composable<Route.Culture> {
        CultureRoute(onNavigateToContent = { id, type -> navController.navigateToContent(id, type) })
    }
    composable<Route.JerusalemContent> {
        JerusalemContentRoute(
            onNavigateToContent = { id, type -> navController.navigateToContent(id, type) },
            onNavigateBack = { navController.popBackStack() },
        )
    }
    composable<Route.TelAvivContent> {
        TelAvivContentRoute(
            onNavigateToContent = { id, type -> navController.navigateToContent(id, type) },
            onNavigateBack = { navController.popBackStack() },
        )
    }
    composable<Route.Judaism> {
        JudaismRoute(onNavigateToContent = { id, type -> navController.navigateToContent(id, type) })
    }
    composable<Route.Flows> {
        FlowsRoute(onNavigateToPlayer = { id, type -> navController.navigate(Route.Player(contentId = id, contentType = type)) })
    }
    composable<Route.MorningRitual> {
        MorningRitualRoute()
    }
    composable<Route.ShabbatMode> {
        ShabbatModeRoute(onNavigateBack = { navController.popBackStack() })
    }
    composable<Route.Glossary> {
        GlossaryRoute(
            onNavigateToTerm = { termId -> navController.navigate(Route.GlossaryDetail(termId = termId)) },
            onNavigateBack = { navController.popBackStack() },
        )
    }
    composable<Route.GlossaryDetail> {
        GlossaryDetailRoute(onNavigateBack = { navController.popBackStack() })
    }
    composable<Route.Children> {
        ChildrenRoute(onNavigateToContent = { id, type -> navController.navigateToContent(id, type) })
    }
    composable<Route.Youngsters> {
        YoungstersRoute(onNavigateToContent = { id, type -> navController.navigateToContent(id, type) })
    }
    composable<Route.VoiceOnboarding> {
        VoiceOnboardingRoute(
            onComplete = { navController.popBackStack() },
            onNavigateBack = { navController.popBackStack() },
        )
    }
    composable<Route.OnboardingAI> {
        AIOnboardingRoute(
            onComplete = { navController.popBackStack() },
            onNavigateBack = { navController.popBackStack() },
        )
    }
    composable<Route.VoiceSearch> {
        VoiceSearchRoute(
            onNavigateBack = { navController.popBackStack() },
            onNavigateToContent = { id -> navController.navigateToContent(id, "vod") },
        )
    }
    composable<Route.VoiceSettings> {
        VoiceSettingsRoute(onNavigateBack = { navController.popBackStack() })
    }
    composable<Route.VoiceWizard> {
        VoiceWizardRoute(
            onComplete = { navController.popBackStack() },
            onNavigateBack = { navController.popBackStack() },
        )
    }
    composable<Route.TalkBack> {
        TalkBackRoute(onNavigateBack = { navController.popBackStack() })
    }
    composable<Route.Chatbot> {
        ChatbotRoute(onNavigateBack = { navController.popBackStack() })
    }
}
