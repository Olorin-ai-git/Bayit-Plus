package tv.bayit.plus.feature.social.grandparent

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import tv.bayit.plus.designsystem.component.GlassButton
import tv.bayit.plus.designsystem.component.GlassCard
import tv.bayit.plus.designsystem.component.GlassTextField
import tv.bayit.plus.designsystem.component.GlassTopBar
import tv.bayit.plus.designsystem.i18n.bayitString
import tv.bayit.plus.designsystem.theme.DesignTokens

/**
 * Route composable for Invite Grandparent screen.
 */
@Composable
fun InviteGrandparentRoute(
    onNavigateBack: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: GrandparentBridgeViewModel = hiltViewModel(),
) {
    val inviteCode by viewModel.inviteCode.collectAsStateWithLifecycle()

    InviteGrandparentScreen(
        inviteCode = inviteCode,
        onCreateInvite = viewModel::createInvite,
        onClearInvite = viewModel::clearInviteCode,
        onNavigateBack = onNavigateBack,
        modifier = modifier,
    )
}

/**
 * Screen for creating a grandparent bridge invite.
 * Allows user to enter grandparent name and generate an invite code.
 */
@Composable
internal fun InviteGrandparentScreen(
    inviteCode: String?,
    onCreateInvite: (String) -> Unit,
    onClearInvite: () -> Unit,
    onNavigateBack: () -> Unit,
    modifier: Modifier = Modifier,
) {
    var grandparentName by remember { mutableStateOf("") }

    Column(modifier = modifier.fillMaxSize()) {
        GlassTopBar(title = bayitString("social.grandparent.title"))

        if (inviteCode != null) {
            InviteCodeDisplay(inviteCode = inviteCode, onClearInvite = onClearInvite)
        } else {
            InviteForm(
                grandparentName = grandparentName,
                onNameChange = { grandparentName = it },
                onCreateInvite = { onCreateInvite(grandparentName) },
            )
        }
    }
}

@Composable
private fun InviteForm(
    grandparentName: String,
    onNameChange: (String) -> Unit,
    onCreateInvite: () -> Unit,
) {
    Column(
        modifier = Modifier.fillMaxSize().padding(DesignTokens.Spacing.md),
        verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md),
    ) {
        GlassCard(modifier = Modifier.fillMaxWidth()) {
            Column(
                modifier = Modifier.padding(DesignTokens.Spacing.md),
                verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md),
            ) {
                Text(
                    text = bayitString("social.grandparent.createInvite"),
                    style = MaterialTheme.typography.titleLarge,
                    color = MaterialTheme.colorScheme.onSurface,
                )

                Text(
                    text = bayitString("social.grandparent.createInviteDescription"),
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )

                GlassTextField(
                    value = grandparentName,
                    onValueChange = onNameChange,
                    label = bayitString("social.grandparent.nameLabel"),
                    placeholder = bayitString("social.grandparent.enterName"),
                    modifier = Modifier.fillMaxWidth(),
                )

                GlassButton(
                    text = bayitString("social.grandparent.generateCode"),
                    onClick = onCreateInvite,
                    enabled = grandparentName.isNotBlank(),
                    modifier = Modifier.fillMaxWidth(),
                )
            }
        }
    }
}

@Composable
private fun InviteCodeDisplay(inviteCode: String, onClearInvite: () -> Unit) {
    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        GlassCard(modifier = Modifier.fillMaxWidth().padding(DesignTokens.Spacing.md)) {
            Column(
                modifier = Modifier.padding(DesignTokens.Spacing.lg),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md),
            ) {
                Text(
                    text = bayitString("social.grandparent.codeGenerated"),
                    style = MaterialTheme.typography.titleLarge,
                    color = MaterialTheme.colorScheme.onSurface,
                )

                Text(
                    text = bayitString("social.grandparent.shareCode"),
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )

                GlassCard {
                    Text(
                        text = inviteCode,
                        style = MaterialTheme.typography.headlineMedium,
                        color = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.padding(DesignTokens.Spacing.md),
                    )
                }

                Text(
                    text = bayitString("social.grandparent.codeInstructions"),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )

                GlassButton(text = bayitString("social.grandparent.createAnother"), onClick = onClearInvite, modifier = Modifier.fillMaxWidth())
            }
        }
    }
}
