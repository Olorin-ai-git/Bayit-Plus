package tv.bayit.plus.ui.viewmodel.zehani

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import tv.bayit.plus.data.model.zehani.WhatsAppContact
import tv.bayit.plus.data.repository.ZehAniRepository
import javax.inject.Inject

data class ContactsUiState(
    val isLoading: Boolean = true,
    val contacts: List<WhatsAppContact> = emptyList(),
    val isAdding: Boolean = false,
    val isRemoving: Boolean = false,
    val error: String? = null
)

@HiltViewModel
class ContactsViewModel @Inject constructor(
    private val repository: ZehAniRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(ContactsUiState())
    val uiState: StateFlow<ContactsUiState> = _uiState.asStateFlow()

    fun loadContacts(profileId: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)

            repository.getContacts(profileId).collect { result ->
                result.fold(
                    onSuccess = { contacts ->
                        _uiState.value = _uiState.value.copy(
                            contacts = contacts,
                            isLoading = false
                        )
                    },
                    onFailure = { error ->
                        _uiState.value = _uiState.value.copy(
                            isLoading = false,
                            error = error.message ?: "Failed to load contacts"
                        )
                    }
                )
            }
        }
    }

    fun addContact(
        profileId: String,
        phoneNumber: String,
        displayName: String,
        relationship: String,
        language: String,
        pin: String
    ) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isAdding = true, error = null)

            repository.addContact(
                profileId, phoneNumber, displayName, relationship, language, pin
            ).collect { result ->
                result.fold(
                    onSuccess = { contact ->
                        _uiState.value = _uiState.value.copy(
                            contacts = _uiState.value.contacts + contact,
                            isAdding = false
                        )
                    },
                    onFailure = { error ->
                        _uiState.value = _uiState.value.copy(
                            isAdding = false,
                            error = error.message ?: "Failed to add contact"
                        )
                    }
                )
            }
        }
    }

    fun removeContact(contactId: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isRemoving = true, error = null)

            repository.removeContact(contactId).collect { result ->
                result.fold(
                    onSuccess = {
                        _uiState.value = _uiState.value.copy(
                            contacts = _uiState.value.contacts.filter { it.id != contactId },
                            isRemoving = false
                        )
                    },
                    onFailure = { error ->
                        _uiState.value = _uiState.value.copy(
                            isRemoving = false,
                            error = error.message ?: "Failed to remove contact"
                        )
                    }
                )
            }
        }
    }
}
