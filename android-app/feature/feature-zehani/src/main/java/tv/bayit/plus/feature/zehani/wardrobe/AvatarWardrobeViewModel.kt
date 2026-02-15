package tv.bayit.plus.feature.zehani.wardrobe

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.common.logging.BayitLogger
import tv.bayit.plus.core.data.repository.AvatarOutfitRepository
import javax.inject.Inject

@HiltViewModel
class AvatarWardrobeViewModel @Inject constructor(
    private val avatarOutfitRepository: AvatarOutfitRepository,
    private val logger: BayitLogger,
) : ViewModel() {

    private val _uiState = MutableStateFlow<AvatarWardrobeUiState>(AvatarWardrobeUiState.Loading)
    val uiState: StateFlow<AvatarWardrobeUiState> = _uiState.asStateFlow()

    init {
        loadWardrobe()
    }

    fun equipOutfit(outfitId: String) {
        viewModelScope.launch {
            logger.debug("Equipping outfit", mapOf("outfitId" to outfitId))
            when (val result = avatarOutfitRepository.equipOutfit(outfitId)) {
                is BayitResult.Success -> {
                    logger.info("Outfit equipped successfully")
                    loadWardrobe()
                }
                is BayitResult.Error -> {
                    logger.error("Failed to equip outfit", result.exception)
                }
                is BayitResult.Loading -> Unit
            }
        }
    }

    fun retry() {
        _uiState.value = AvatarWardrobeUiState.Loading
        loadWardrobe()
    }

    private fun loadWardrobe() {
        viewModelScope.launch {
            logger.debug("Loading avatar wardrobe")
            when (val outfitsResult = avatarOutfitRepository.getAvailableOutfits()) {
                is BayitResult.Success -> {
                    when (val equippedResult = avatarOutfitRepository.getEquippedOutfit()) {
                        is BayitResult.Success -> {
                            logger.info(
                                "Wardrobe loaded",
                                mapOf("outfitCount" to outfitsResult.data.size.toString()),
                            )
                            _uiState.value = AvatarWardrobeUiState.Success(
                                outfits = outfitsResult.data.mapIndexed { index, _ ->
                                    AvatarOutfit(
                                        id = "outfit_$index",
                                        name = "Outfit ${index + 1}",
                                        thumbnailUrl = null,
                                    )
                                },
                                equippedId = null,
                            )
                        }
                        is BayitResult.Error -> {
                            logger.error("Failed to load equipped outfit", equippedResult.exception)
                            _uiState.value = AvatarWardrobeUiState.Success(
                                outfits = outfitsResult.data.mapIndexed { index, _ ->
                                    AvatarOutfit(
                                        id = "outfit_$index",
                                        name = "Outfit ${index + 1}",
                                        thumbnailUrl = null,
                                    )
                                },
                                equippedId = null,
                            )
                        }
                        is BayitResult.Loading -> Unit
                    }
                }
                is BayitResult.Error -> {
                    logger.error("Failed to load wardrobe", outfitsResult.exception)
                    _uiState.value = AvatarWardrobeUiState.Error(
                        outfitsResult.message ?: outfitsResult.exception.message.orEmpty(),
                    )
                }
                is BayitResult.Loading -> Unit
            }
        }
    }
}

sealed interface AvatarWardrobeUiState {
    data object Loading : AvatarWardrobeUiState
    data class Success(
        val outfits: List<AvatarOutfit>,
        val equippedId: String?,
    ) : AvatarWardrobeUiState
    data class Error(val message: String) : AvatarWardrobeUiState
}

data class AvatarOutfit(
    val id: String,
    val name: String,
    val thumbnailUrl: String?,
)
