package tv.bayit.plus.feature.zehani.mesh

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.common.logging.BayitLogger
import tv.bayit.plus.core.data.repository.AvatarMeshRepository
import javax.inject.Inject

@HiltViewModel
class MeshAvatarViewModel @Inject constructor(
    private val avatarMeshRepository: AvatarMeshRepository,
    private val logger: BayitLogger,
) : ViewModel() {

    private val _uiState = MutableStateFlow<MeshAvatarUiState>(MeshAvatarUiState.Loading)
    val uiState: StateFlow<MeshAvatarUiState> = _uiState.asStateFlow()

    init {
        loadMeshAvatar()
    }

    fun updateSkinTone(tone: String) {
        val currentState = _uiState.value
        if (currentState is MeshAvatarUiState.Success) {
            viewModelScope.launch {
                logger.debug("Updating skin tone", mapOf("tone" to tone))
                _uiState.value = currentState.copy(skinTone = tone)
            }
        }
    }

    fun updateHairStyle(style: String) {
        val currentState = _uiState.value
        if (currentState is MeshAvatarUiState.Success) {
            viewModelScope.launch {
                logger.debug("Updating hair style", mapOf("style" to style))
                _uiState.value = currentState.copy(hairStyle = style)
            }
        }
    }

    fun toggleAccessory(accessory: String) {
        val currentState = _uiState.value
        if (currentState is MeshAvatarUiState.Success) {
            viewModelScope.launch {
                logger.debug("Toggling accessory", mapOf("accessory" to accessory))
                val updatedAccessories = if (currentState.accessories.contains(accessory)) {
                    currentState.accessories - accessory
                } else {
                    currentState.accessories + accessory
                }
                _uiState.value = currentState.copy(accessories = updatedAccessories)
            }
        }
    }

    fun save() {
        val currentState = _uiState.value
        if (currentState is MeshAvatarUiState.Success) {
            viewModelScope.launch {
                logger.info("Saving avatar mesh configuration")
                val config = mapOf(
                    "skinTone" to currentState.skinTone,
                    "hairStyle" to currentState.hairStyle,
                    "accessories" to currentState.accessories,
                )
                when (val result = avatarMeshRepository.updateMesh("default_avatar", config)) {
                    is BayitResult.Success -> {
                        logger.info("Avatar mesh saved successfully")
                    }
                    is BayitResult.Error -> {
                        logger.error("Failed to save avatar mesh", result.exception)
                    }
                    is BayitResult.Loading -> Unit
                }
            }
        }
    }

    fun retry() {
        _uiState.value = MeshAvatarUiState.Loading
        loadMeshAvatar()
    }

    private fun loadMeshAvatar() {
        viewModelScope.launch {
            logger.debug("Loading mesh avatar")
            when (val result = avatarMeshRepository.getCustomizationOptions()) {
                is BayitResult.Success -> {
                    logger.info("Mesh avatar loaded")
                    _uiState.value = MeshAvatarUiState.Success(
                        meshUrl = null,
                        skinTone = SKIN_TONES.first(),
                        hairStyle = HAIR_STYLES.first(),
                        accessories = emptyList(),
                    )
                }
                is BayitResult.Error -> {
                    logger.error("Failed to load mesh avatar", result.exception)
                    _uiState.value = MeshAvatarUiState.Error(
                        result.message ?: result.exception.message.orEmpty(),
                    )
                }
                is BayitResult.Loading -> Unit
            }
        }
    }
}

sealed interface MeshAvatarUiState {
    data object Loading : MeshAvatarUiState
    data class Success(
        val meshUrl: String?,
        val skinTone: String,
        val hairStyle: String,
        val accessories: List<String>,
    ) : MeshAvatarUiState
    data class Error(val message: String) : MeshAvatarUiState
}

val SKIN_TONES = listOf("Light", "Medium", "Tan", "Dark")
val HAIR_STYLES = listOf("Short", "Long", "Curly", "Straight", "Wavy")
val AVAILABLE_ACCESSORIES = listOf("Glasses", "Hat", "Earrings", "Necklace")
