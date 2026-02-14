package tv.bayit.plus.core.model

import kotlinx.serialization.Serializable

@Serializable
data class Reward(
    val id: String,
    val title: String,
    val description: String? = null,
    val points: Int,
    val iconUrl: String? = null,
    val isUnlocked: Boolean = false,
    val unlockedAt: String? = null,
)

@Serializable
data class RewardProgress(
    val totalPoints: Int = 0,
    val level: Int = 1,
    val nextLevelPoints: Int = 100,
    val streak: Int = 0,
    val rewards: List<Reward> = emptyList(),
)
