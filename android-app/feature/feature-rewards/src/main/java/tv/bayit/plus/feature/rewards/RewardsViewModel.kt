package tv.bayit.plus.feature.rewards

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.common.logging.BayitLogger
import tv.bayit.plus.core.data.repository.RewardRepository
import tv.bayit.plus.core.model.Reward
import javax.inject.Inject

@HiltViewModel
class RewardsViewModel @Inject constructor(
    private val rewardRepository: RewardRepository,
    private val logger: BayitLogger,
) : ViewModel() {

    private val _uiState = MutableStateFlow<RewardsUiState>(RewardsUiState.Loading)
    val uiState: StateFlow<RewardsUiState> = _uiState.asStateFlow()

    init {
        loadRewards()
    }

    fun refresh() {
        val currentState = _uiState.value
        if (currentState is RewardsUiState.Success) {
            _uiState.value = currentState.copy(isRefreshing = true)
        }
        loadRewards()
    }

    fun claimReward(rewardId: String) {
        val currentState = _uiState.value as? RewardsUiState.Success ?: return

        _uiState.value = currentState.copy(claimingRewardId = rewardId)

        viewModelScope.launch {
            logger.debug("Claiming reward", mapOf("rewardId" to rewardId))

            when (val result = rewardRepository.claimReward(rewardId)) {
                is BayitResult.Success -> {
                    logger.info("Reward claimed", mapOf("rewardId" to rewardId))
                    loadRewards()
                }
                is BayitResult.Error -> {
                    logger.error("Reward claim failed", result.exception, mapOf("rewardId" to rewardId))
                    _uiState.value = currentState.copy(claimingRewardId = null)
                }
                is BayitResult.Loading -> Unit
            }
        }
    }

    fun retry() {
        _uiState.value = RewardsUiState.Loading
        loadRewards()
    }

    private fun loadRewards() {
        viewModelScope.launch {
            logger.debug("Loading rewards")

            val pointsResult = rewardRepository.getPointsBalance()
            val pointsBalance = when (pointsResult) {
                is BayitResult.Success -> pointsResult.data
                else -> 0
            }

            when (val availableResult = rewardRepository.getAvailableRewards()) {
                is BayitResult.Success -> {
                    @Suppress("UNCHECKED_CAST")
                    val available = (availableResult.data as List<Any>).filterIsInstance<Reward>()

                    val earned = when (val earnedResult = rewardRepository.getEarnedRewards()) {
                        is BayitResult.Success -> {
                            @Suppress("UNCHECKED_CAST")
                            (earnedResult.data as List<Any>).filterIsInstance<Reward>()
                        }
                        else -> emptyList()
                    }

                    logger.info(
                        "Rewards loaded",
                        mapOf(
                            "availableCount" to available.size.toString(),
                            "earnedCount" to earned.size.toString(),
                            "points" to pointsBalance.toString(),
                        ),
                    )

                    _uiState.value = RewardsUiState.Success(
                        pointsBalance = pointsBalance,
                        availableRewards = available,
                        earnedRewards = earned,
                        isRefreshing = false,
                        claimingRewardId = null,
                    )
                }
                is BayitResult.Error -> {
                    logger.error(
                        "Rewards load failed",
                        availableResult.exception,
                        mapOf("errorMessage" to availableResult.message.orEmpty()),
                    )
                    _uiState.value = RewardsUiState.Error(
                        message = availableResult.message ?: availableResult.exception.message.orEmpty(),
                    )
                }
                is BayitResult.Loading -> Unit
            }
        }
    }
}

sealed interface RewardsUiState {
    data object Loading : RewardsUiState

    data class Success(
        val pointsBalance: Int,
        val availableRewards: List<Reward>,
        val earnedRewards: List<Reward>,
        val isRefreshing: Boolean = false,
        val claimingRewardId: String? = null,
    ) : RewardsUiState

    data class Error(val message: String) : RewardsUiState
}
