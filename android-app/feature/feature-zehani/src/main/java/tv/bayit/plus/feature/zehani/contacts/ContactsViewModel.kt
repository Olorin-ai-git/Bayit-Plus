package tv.bayit.plus.feature.zehani.contacts

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.common.logging.BayitLogger
import tv.bayit.plus.core.data.repository.ZehAniRepository
import tv.bayit.plus.core.model.zehani.WhatsAppContact
import javax.inject.Inject

@HiltViewModel
class ContactsViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val zehAniRepository: ZehAniRepository,
    private val logger: BayitLogger,
) : ViewModel() {

    private val profileId: String = savedStateHandle["profileId"] ?: "current"

    private val _uiState = MutableStateFlow<ContactsUiState>(ContactsUiState.Loading)
    val uiState: StateFlow<ContactsUiState> = _uiState.asStateFlow()

    private val _searchQuery = MutableStateFlow("")
    val searchQuery: StateFlow<String> = _searchQuery.asStateFlow()

    init {
        loadContacts()
    }

    fun updateSearchQuery(query: String) {
        _searchQuery.value = query
        val current = _uiState.value as? ContactsUiState.Success ?: return
        val filtered = if (query.isBlank()) {
            current.allContacts
        } else {
            current.allContacts.filter {
                it.displayName.contains(query, ignoreCase = true) ||
                    it.relationship.contains(query, ignoreCase = true)
            }
        }
        _uiState.value = current.copy(filteredContacts = filtered)
    }

    fun addContact(displayName: String, phoneNumber: String, pin: String) {
        viewModelScope.launch {
            logger.debug("Adding WhatsApp contact", mapOf("name" to displayName))
            when (val result = zehAniRepository.addContact(
                profileId, phoneNumber, displayName, "grandparent", "he", pin,
            )) {
                is BayitResult.Success -> {
                    logger.info("Contact added", mapOf("contactId" to result.data.id))
                    loadContacts()
                }
                is BayitResult.Error -> {
                    logger.error("Add contact failed", result.exception)
                }
                is BayitResult.Loading -> Unit
            }
        }
    }

    fun deleteContact(contactId: String) {
        viewModelScope.launch {
            logger.debug("Deleting contact", mapOf("contactId" to contactId))
            when (val result = zehAniRepository.deleteContact(contactId)) {
                is BayitResult.Success -> {
                    logger.info("Contact deleted", mapOf("contactId" to contactId))
                    loadContacts()
                }
                is BayitResult.Error -> {
                    logger.error("Delete contact failed", result.exception)
                }
                is BayitResult.Loading -> Unit
            }
        }
    }

    fun retry() {
        _uiState.value = ContactsUiState.Loading
        _searchQuery.value = ""
        loadContacts()
    }

    private fun loadContacts() {
        viewModelScope.launch {
            logger.debug("Loading WhatsApp contacts", mapOf("profileId" to profileId))
            when (val result = zehAniRepository.listContacts(profileId)) {
                is BayitResult.Success -> {
                    val contacts = result.data
                    logger.info("Contacts loaded", mapOf("count" to contacts.size.toString()))
                    _uiState.value = ContactsUiState.Success(
                        allContacts = contacts,
                        filteredContacts = contacts,
                    )
                }
                is BayitResult.Error -> {
                    logger.error("Contacts load failed", result.exception)
                    _uiState.value = ContactsUiState.Error(
                        message = result.message ?: result.exception.message.orEmpty(),
                    )
                }
                is BayitResult.Loading -> Unit
            }
        }
    }
}

sealed interface ContactsUiState {
    data object Loading : ContactsUiState

    data class Success(
        val allContacts: List<WhatsAppContact>,
        val filteredContacts: List<WhatsAppContact>,
    ) : ContactsUiState

    data class Error(val message: String) : ContactsUiState
}
