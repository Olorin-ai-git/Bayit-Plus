package tv.bayit.plus.navigation

import androidx.navigation.NavController
import androidx.navigation.NavGraphBuilder
import androidx.navigation.compose.composable
import tv.bayit.plus.feature.social.chess.ChessRoute
import tv.bayit.plus.feature.social.grandparent.NewsClipRoute
import tv.bayit.plus.feature.social.conversation.ConversationRoute
import tv.bayit.plus.feature.social.feed.ActivityFeedRoute
import tv.bayit.plus.feature.social.friends.FriendsRoute
import tv.bayit.plus.feature.social.messages.DirectMessagesRoute
import tv.bayit.plus.feature.social.watchparty.WatchPartyRoute
import tv.bayit.plus.feature.social.watchparty.active.ActivePartyRoute
import tv.bayit.plus.feature.trivia.TriviaRoute

fun NavGraphBuilder.socialNavGraph(navController: NavController) {
    composable<Route.Friends> {
        FriendsRoute(onNavigateBack = { navController.popBackStack() })
    }
    composable<Route.DirectMessages> {
        DirectMessagesRoute(
            onNavigateToConversation = { friendId ->
                navController.navigate(Route.Conversation(friendId = friendId))
            },
            onNavigateBack = { navController.popBackStack() },
        )
    }
    composable<Route.Conversation> {
        ConversationRoute(onNavigateBack = { navController.popBackStack() })
    }
    composable<Route.WatchParty> {
        WatchPartyRoute(
            onNavigateToActiveParty = { partyId ->
                navController.navigate(Route.WatchPartyDetail(partyId = partyId))
            },
            onNavigateBack = { navController.popBackStack() },
        )
    }
    composable<Route.WatchPartyDetail> {
        ActivePartyRoute(onNavigateBack = { navController.popBackStack() })
    }
    composable<Route.Chess> {
        ChessRoute(onNavigateBack = { navController.popBackStack() })
    }
    composable<Route.ActivityFeed> {
        ActivityFeedRoute(onNavigateBack = { navController.popBackStack() })
    }
    composable<Route.Trivia> {
        TriviaRoute(onNavigateBack = { navController.popBackStack() })
    }
    composable<Route.NewsClip> {
        NewsClipRoute(
            onNavigateToPlayer = { id, type -> navController.navigate(Route.Player(contentId = id, contentType = type)) },
            onNavigateBack = { navController.popBackStack() },
        )
    }
}
