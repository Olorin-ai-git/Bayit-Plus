package tv.bayit.plus.feature.social.friends

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import tv.bayit.plus.core.model.Friend
import tv.bayit.plus.core.model.FriendRequest
import tv.bayit.plus.designsystem.component.CachedAsyncImage
import tv.bayit.plus.designsystem.component.GlassButton
import tv.bayit.plus.designsystem.component.GlassCard
import tv.bayit.plus.designsystem.component.GlassChip
import tv.bayit.plus.designsystem.component.GlassLoadingIndicator
import tv.bayit.plus.designsystem.component.GlassSearchBar
import tv.bayit.plus.designsystem.component.GlassTopBar
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
        GlassTopBar(title = "Friends")
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
            GlassChip(
                label = tab.label,
                isSelected = tab == selectedTab,
                onClick = { onTabSelected(tab) },
            )
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
private fun FriendCard(friend: Friend) {
    GlassCard(modifier = Modifier.fillMaxWidth()) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md),
        ) {
            AvatarCircle(url = friend.avatarUrl, isOnline = friend.isOnline)
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = friend.displayName,
                    color = DesignTokens.Colors.Text.primary,
                    fontWeight = FontWeight.SemiBold,
                    fontSize = DesignTokens.FontSize.md,
                )
                Text(
                    text = if (friend.isOnline) "Online" else friend.lastSeen.orEmpty(),
                    color = if (friend.isOnline) DesignTokens.Colors.Semantic.success
                    else DesignTokens.Colors.Text.muted,
                    fontSize = DesignTokens.FontSize.sm,
                )
            }
        }
    }
}

@Composable
private fun AvatarCircle(url: String?, isOnline: Boolean) {
    Box(modifier = Modifier.size(48.dp)) {
        CachedAsyncImage(
            url = url,
            contentDescription = null,
            modifier = Modifier.size(48.dp).clip(CircleShape),
        )
        if (isOnline) {
            Box(
                modifier = Modifier.size(12.dp).align(Alignment.BottomEnd)
                    .clip(CircleShape).background(DesignTokens.Colors.Semantic.success),
            )
        }
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
            GlassCard(modifier = Modifier.fillMaxWidth()) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm),
                ) {
                    AvatarCircle(url = request.fromUser.avatarUrl, isOnline = false)
                    Text(
                        text = request.fromUser.displayName,
                        color = DesignTokens.Colors.Text.primary,
                        modifier = Modifier.weight(1f),
                    )
                    GlassButton(text = "Accept", onClick = { onAccept(request.id) })
                    GlassButton(
                        text = "Decline",
                        onClick = { onDecline(request.id) },
                        isPrimary = false,
                    )
                }
            }
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
        GlassSearchBar(query = query, onQueryChange = onQueryChanged, placeholder = "Search users")
        GlassButton(text = "Search", onClick = onSearch)
        LazyColumn(verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm)) {
            items(results, key = { it.id }) { user ->
                GlassCard(modifier = Modifier.fillMaxWidth()) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm),
                    ) {
                        AvatarCircle(url = user.avatarUrl, isOnline = user.isOnline)
                        Text(
                            text = user.displayName,
                            color = DesignTokens.Colors.Text.primary,
                            modifier = Modifier.weight(1f),
                        )
                        GlassButton(text = "Add", onClick = { onSendRequest(user.id) })
                    }
                }
            }
        }
    }
}

@Composable
private fun ErrorContent(message: String) {
    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Text(
            text = message,
            color = DesignTokens.Colors.Semantic.error,
            style = MaterialTheme.typography.bodyLarge,
        )
    }
}

private val FriendsTab.label: String
    get() = when (this) {
        FriendsTab.FRIENDS -> "Friends"
        FriendsTab.PENDING -> "Pending"
        FriendsTab.SEARCH -> "Search"
    }
