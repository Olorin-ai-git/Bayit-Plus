package tv.bayit.plus.feature.social.feed

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.common.logging.BayitLogger
import tv.bayit.plus.core.data.repository.StatsRepository
import javax.inject.Inject

@HiltViewModel
class ActivityFeedViewModel @Inject constructor(
    private val statsRepository: StatsRepository,
    private val logger: BayitLogger,
) : ViewModel() {

    private val _uiState = MutableStateFlow<ActivityFeedUiState>(ActivityFeedUiState.Loading)
    val uiState: StateFlow<ActivityFeedUiState> = _uiState.asStateFlow()

    init {
        loadActivityFeed()
    }

    fun refresh() {
        loadActivityFeed()
    }

    private fun loadActivityFeed() {
        viewModelScope.launch {
            _uiState.value = ActivityFeedUiState.Loading
            logger.debug("Loading activity feed")
            when (val result = statsRepository.getWeeklyReport()) {
                is BayitResult.Success -> {
                    val activities = parseActivities(result.data)
                    logger.info(
                        "Activity feed loaded",
                        mapOf("count" to activities.size.toString()),
                    )
                    _uiState.value = ActivityFeedUiState.Success(activities)
                }
                is BayitResult.Error -> {
                    logger.error("Activity feed load failed", result.exception)
                    _uiState.value = ActivityFeedUiState.Error(
                        result.message ?: result.exception.message.orEmpty(),
                    )
                }
                is BayitResult.Loading -> Unit
            }
        }
    }

    private fun parseActivities(data: Any): List<ActivityItem> {
        if (data is Map<*, *>) {
            @Suppress("UNCHECKED_CAST")
            val items = data["activities"] as? List<Map<String, Any?>> ?: return emptyList()
            return items.mapNotNull { map ->
                val friendName = map["friend_name"] as? String ?: return@mapNotNull null
                val action = map["action"] as? String ?: return@mapNotNull null
                val contentTitle = map["content_title"] as? String
                val timestamp = map["timestamp"] as? String ?: ""
                val avatarUrl = map["avatar_url"] as? String
                ActivityItem(
                    friendName = friendName,
                    action = action,
                    contentTitle = contentTitle,
                    timestamp = timestamp,
                    avatarUrl = avatarUrl,
                )
            }
        }
        return emptyList()
    }
}

sealed interface ActivityFeedUiState {
    data object Loading : ActivityFeedUiState
    data class Success(val activities: List<ActivityItem>) : ActivityFeedUiState
    data class Error(val message: String) : ActivityFeedUiState
}

data class ActivityItem(
    val friendName: String,
    val action: String,
    val contentTitle: String?,
    val timestamp: String,
    val avatarUrl: String?,
)
