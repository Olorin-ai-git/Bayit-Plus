package tv.bayit.plus.feature.social.friends

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.common.logging.BayitLogger
import tv.bayit.plus.core.data.repository.FriendsRepository
import tv.bayit.plus.core.model.Friend
import tv.bayit.plus.core.model.FriendRequest
import javax.inject.Inject

@HiltViewModel
class FriendsViewModel @Inject constructor(
    private val friendsRepository: FriendsRepository,
    private val logger: BayitLogger,
) : ViewModel() {

    private val _uiState = MutableStateFlow<FriendsUiState>(FriendsUiState.Loading)
    val uiState: StateFlow<FriendsUiState> = _uiState.asStateFlow()

    private val _selectedTab = MutableStateFlow(FriendsTab.FRIENDS)
    val selectedTab: StateFlow<FriendsTab> = _selectedTab.asStateFlow()

    private val _searchQuery = MutableStateFlow("")
    val searchQuery: StateFlow<String> = _searchQuery.asStateFlow()

    init {
        loadFriends()
    }

    fun selectTab(tab: FriendsTab) {
        _selectedTab.value = tab
        when (tab) {
            FriendsTab.FRIENDS -> loadFriends()
            FriendsTab.PENDING -> loadPendingRequests()
            FriendsTab.SEARCH -> Unit
        }
    }

    fun updateSearchQuery(query: String) {
        _searchQuery.value = query
    }

    fun searchUsers() {
        val query = _searchQuery.value
        if (query.isBlank()) return
        viewModelScope.launch {
            _uiState.value = FriendsUiState.Loading
            logger.debug("Searching users", mapOf("query" to query))
            when (val result = friendsRepository.searchUsers(query)) {
                is BayitResult.Success -> {
                    val users = result.data.filterIsInstance<Friend>()
                    _uiState.value = FriendsUiState.SearchResults(users)
                }
                is BayitResult.Error -> {
                    logger.error("User search failed", result.exception)
                    _uiState.value = FriendsUiState.Error(
                        result.message ?: result.exception.message.orEmpty(),
                    )
                }
                is BayitResult.Loading -> Unit
            }
        }
    }

    fun sendRequest(userId: String) {
        viewModelScope.launch {
            logger.info("Sending friend request", mapOf("userId" to userId))
            when (val result = friendsRepository.sendRequest(userId)) {
                is BayitResult.Success -> logger.info("Friend request sent")
                is BayitResult.Error -> logger.error("Friend request failed", result.exception)
                is BayitResult.Loading -> Unit
            }
        }
    }

    fun acceptRequest(requestId: String) {
        viewModelScope.launch {
            logger.info("Accepting friend request", mapOf("requestId" to requestId))
            when (val result = friendsRepository.acceptRequest(requestId)) {
                is BayitResult.Success -> loadPendingRequests()
                is BayitResult.Error -> logger.error("Accept request failed", result.exception)
                is BayitResult.Loading -> Unit
            }
        }
    }

    fun declineRequest(requestId: String) {
        viewModelScope.launch {
            logger.info("Declining friend request", mapOf("requestId" to requestId))
            when (val result = friendsRepository.declineRequest(requestId)) {
                is BayitResult.Success -> loadPendingRequests()
                is BayitResult.Error -> logger.error("Decline request failed", result.exception)
                is BayitResult.Loading -> Unit
            }
        }
    }

    private fun loadFriends() {
        viewModelScope.launch {
            _uiState.value = FriendsUiState.Loading
            logger.debug("Loading friends list")
            when (val result = friendsRepository.getFriends()) {
                is BayitResult.Success -> {
                    val friends = result.data.filterIsInstance<Friend>()
                    logger.info("Friends loaded", mapOf("count" to friends.size.toString()))
                    _uiState.value = FriendsUiState.FriendsList(friends)
                }
                is BayitResult.Error -> {
                    logger.error("Friends load failed", result.exception)
                    _uiState.value = FriendsUiState.Error(
                        result.message ?: result.exception.message.orEmpty(),
                    )
                }
                is BayitResult.Loading -> Unit
            }
        }
    }

    private fun loadPendingRequests() {
        viewModelScope.launch {
            _uiState.value = FriendsUiState.Loading
            logger.debug("Loading pending requests")
            when (val result = friendsRepository.getPendingRequests()) {
                is BayitResult.Success -> {
                    val requests = result.data.filterIsInstance<FriendRequest>()
                    _uiState.value = FriendsUiState.PendingRequests(requests)
                }
                is BayitResult.Error -> {
                    logger.error("Pending requests load failed", result.exception)
                    _uiState.value = FriendsUiState.Error(
                        result.message ?: result.exception.message.orEmpty(),
                    )
                }
                is BayitResult.Loading -> Unit
            }
        }
    }
}

sealed interface FriendsUiState {
    data object Loading : FriendsUiState
    data class FriendsList(val friends: List<Friend>) : FriendsUiState
    data class PendingRequests(val requests: List<FriendRequest>) : FriendsUiState
    data class SearchResults(val users: List<Friend>) : FriendsUiState
    data class Error(val message: String) : FriendsUiState
}

enum class FriendsTab { FRIENDS, PENDING, SEARCH }
