package tv.bayit.plus.feature.zehani.contacts

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import tv.bayit.plus.core.model.zehani.WhatsAppContact
import tv.bayit.plus.designsystem.component.GlassButton
import tv.bayit.plus.designsystem.component.GlassCard
import tv.bayit.plus.designsystem.component.GlassLoadingIndicator
import tv.bayit.plus.designsystem.component.GlassSearchBar
import tv.bayit.plus.designsystem.component.GlassTopBar
import tv.bayit.plus.designsystem.theme.DesignTokens

@Composable
fun ContactsRoute(
    onNavigateBack: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: ContactsViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val searchQuery by viewModel.searchQuery.collectAsStateWithLifecycle()
    ContactsScreen(
        uiState = uiState,
        searchQuery = searchQuery,
        onSearchQueryChange = viewModel::updateSearchQuery,
        onDeleteContact = viewModel::deleteContact,
        onNavigateBack = onNavigateBack,
        onRetry = viewModel::retry,
        modifier = modifier,
    )
}

@Composable
internal fun ContactsScreen(
    uiState: ContactsUiState,
    searchQuery: String,
    onSearchQueryChange: (String) -> Unit,
    onDeleteContact: (String) -> Unit,
    onNavigateBack: () -> Unit,
    onRetry: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(modifier = modifier.fillMaxSize()) {
        GlassTopBar(title = "Contacts")
        when (uiState) {
            is ContactsUiState.Loading -> GlassLoadingIndicator()
            is ContactsUiState.Error -> ErrorContent(message = uiState.message, onRetry = onRetry)
            is ContactsUiState.Success -> ContactsContent(
                contacts = uiState.filteredContacts,
                searchQuery = searchQuery,
                onSearchQueryChange = onSearchQueryChange,
                onDeleteContact = onDeleteContact,
            )
        }
    }
}

@Composable
private fun ContactsContent(
    contacts: List<WhatsAppContact>,
    searchQuery: String,
    onSearchQueryChange: (String) -> Unit,
    onDeleteContact: (String) -> Unit,
) {
    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(horizontal = DesignTokens.Spacing.base),
        verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm),
    ) {
        item {
            Spacer(Modifier.height(DesignTokens.Spacing.sm))
            GlassSearchBar(
                query = searchQuery,
                onQueryChange = onSearchQueryChange,
                placeholder = "Search contacts...",
            )
            Spacer(Modifier.height(DesignTokens.Spacing.sm))
        }

        if (contacts.isEmpty()) {
            item {
                Box(
                    modifier = Modifier.fillMaxWidth().padding(DesignTokens.Spacing.xxl),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(
                        text = if (searchQuery.isBlank()) "No contacts yet" else "No matching contacts",
                        color = DesignTokens.Colors.Text.muted,
                        style = MaterialTheme.typography.bodyLarge,
                    )
                }
            }
        }

        items(contacts, key = { it.id }) { contact ->
            ContactCard(contact = contact, onDelete = { onDeleteContact(contact.id) })
        }
    }
}

@Composable
private fun ContactCard(contact: WhatsAppContact, onDelete: () -> Unit) {
    GlassCard(modifier = Modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = contact.displayName,
                    style = MaterialTheme.typography.bodyMedium,
                    color = DesignTokens.Colors.Text.primary,
                    fontWeight = FontWeight.Medium,
                )
                Text(
                    text = "${contact.relationship} - ${contact.language}",
                    style = MaterialTheme.typography.bodySmall,
                    color = DesignTokens.Colors.Text.secondary,
                )
                if (contact.totalReelsSent > 0) {
                    Text(
                        text = "${contact.totalReelsSent} reels shared",
                        style = MaterialTheme.typography.bodySmall,
                        color = DesignTokens.Colors.Text.muted,
                    )
                }
            }
            GlassButton(text = "Remove", onClick = onDelete, isPrimary = false)
        }
    }
}

@Composable
private fun ErrorContent(message: String, onRetry: () -> Unit) {
    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md),
        ) {
            Text(text = message, color = DesignTokens.Colors.Semantic.error)
            GlassButton(text = "Retry", onClick = onRetry)
        }
    }
}
