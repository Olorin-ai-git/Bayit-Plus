package tv.bayit.plus.feature.social.friends

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import tv.bayit.plus.core.model.Friend
import tv.bayit.plus.core.model.FriendRequest
import tv.bayit.plus.designsystem.component.GlassButton
import tv.bayit.plus.designsystem.component.GlassChip
import tv.bayit.plus.designsystem.component.GlassLoadingIndicator
import tv.bayit.plus.designsystem.component.GlassSearchBar
import tv.bayit.plus.designsystem.component.GlassTopBar
import tv.bayit.plus.designsystem.i18n.bayitString
import tv.bayit.plus.designsystem.theme.DesignTokens

@Composable
fun FriendsRoute(
    onNavigateBack: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: FriendsViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val selectedTab by viewModel.selectedTab.collectAsStateWithLifecycle()
    val searchQuery by viewModel.searchQuery.collectAsStateWithLifecycle()

    FriendsScreen(
        uiState = uiState,
        selectedTab = selectedTab,
        searchQuery = searchQuery,
        onTabSelected = viewModel::selectTab,
        onSearchQueryChanged = viewModel::updateSearchQuery,
        onSearch = viewModel::searchUsers,
        onSendRequest = viewModel::sendRequest,
        onAcceptRequest = viewModel::acceptRequest,
        onDeclineRequest = viewModel::declineRequest,
        onNavigateBack = onNavigateBack,
        modifier = modifier,
    )
}

@Composable
internal fun FriendsScreen(
    uiState: FriendsUiState,
    selectedTab: FriendsTab,
    searchQuery: String,
    onTabSelected: (FriendsTab) -> Unit,
    onSearchQueryChanged: (String) -> Unit,
    onSearch: () -> Unit,
    onSendRequest: (String) -> Unit,
    onAcceptRequest: (String) -> Unit,
    onDeclineRequest: (String) -> Unit,
    onNavigateBack: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(modifier = modifier.fillMaxSize()) {
        GlassTopBar(title = bayitString("friends.title"))
        TabRow(selectedTab = selectedTab, onTabSelected = onTabSelected)

        when (uiState) {
            is FriendsUiState.Loading -> GlassLoadingIndicator()
            is FriendsUiState.FriendsList -> FriendListContent(uiState.friends)
            is FriendsUiState.PendingRequests -> PendingContent(
                uiState.requests, onAcceptRequest, onDeclineRequest,
            )
            is FriendsUiState.SearchResults -> SearchContent(
                searchQuery, onSearchQueryChanged, onSearch, uiState.users, onSendRequest,
            )
            is FriendsUiState.Error -> ErrorContent(uiState.message)
        }

        if (selectedTab == FriendsTab.SEARCH && uiState !is FriendsUiState.SearchResults) {
            SearchContent(searchQuery, onSearchQueryChanged, onSearch, emptyList(), onSendRequest)
        }
    }
}

@Composable
private fun TabRow(selectedTab: FriendsTab, onTabSelected: (FriendsTab) -> Unit) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(DesignTokens.Spacing.sm),
        horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm),
    ) {
        FriendsTab.entries.forEach { tab ->
            GlassChip(label = bayitString(tab.labelKey), isSelected = tab == selectedTab, onClick = { onTabSelected(tab) })
        }
    }
}

@Composable
private fun FriendListContent(friends: List<Friend>) {
    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(horizontal = DesignTokens.Spacing.base),
        verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm),
    ) {
        items(friends, key = { it.id }) { friend -> FriendCard(friend) }
    }
}

@Composable
private fun PendingContent(
    requests: List<FriendRequest>,
    onAccept: (String) -> Unit,
    onDecline: (String) -> Unit,
) {
    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(horizontal = DesignTokens.Spacing.base),
        verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm),
    ) {
        items(requests, key = { it.id }) { request ->
            PendingRequestCard(request = request, onAccept = onAccept, onDecline = onDecline)
        }
    }
}

@Composable
private fun SearchContent(
    query: String,
    onQueryChanged: (String) -> Unit,
    onSearch: () -> Unit,
    results: List<Friend>,
    onSendRequest: (String) -> Unit,
) {
    Column(
        modifier = Modifier.fillMaxSize().padding(DesignTokens.Spacing.base),
        verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md),
    ) {
        GlassSearchBar(query = query, onQueryChange = onQueryChanged, placeholder = bayitString("friends.findPlayers"))
        GlassButton(text = bayitString("common.search"), onClick = onSearch)
        LazyColumn(verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm)) {
            items(results, key = { it.id }) { user ->
                SearchResultCard(user = user, onSendRequest = onSendRequest)
            }
        }
    }
}

@Composable
private fun ErrorContent(message: String) {
    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Text(text = message, color = DesignTokens.Colors.Semantic.error, style = MaterialTheme.typography.bodyLarge)
    }
}

private val FriendsTab.labelKey: String
    get() = when (this) {
        FriendsTab.FRIENDS -> "friends.title"
        FriendsTab.PENDING -> "friends.requests"
        FriendsTab.SEARCH -> "common.search"
    }
