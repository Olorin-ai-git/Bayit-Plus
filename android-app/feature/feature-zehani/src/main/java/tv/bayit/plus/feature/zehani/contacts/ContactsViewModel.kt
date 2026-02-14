package tv.bayit.plus.feature.zehani.contacts

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
import javax.inject.Inject

@HiltViewModel
class ContactsViewModel @Inject constructor(
    private val zehAniRepository: ZehAniRepository,
    private val logger: BayitLogger,
) : ViewModel() {

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
                it.toString().contains(query, ignoreCase = true)
            }
        }
        _uiState.value = current.copy(filteredContacts = filtered)
    }

    fun addContact(name: String, photoUri: String?) {
        viewModelScope.launch {
            logger.debug("Adding Zeh Ani contact", mapOf("name" to name))
            when (val result = zehAniRepository.addContact(name, photoUri)) {
                is BayitResult.Success -> {
                    logger.info("Contact added", mapOf("name" to name))
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
            logger.debug("Loading Zeh Ani contacts")
            when (val result = zehAniRepository.getContacts()) {
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
        val allContacts: List<Any>,
        val filteredContacts: List<Any>,
    ) : ContactsUiState

    data class Error(val message: String) : ContactsUiState
}
