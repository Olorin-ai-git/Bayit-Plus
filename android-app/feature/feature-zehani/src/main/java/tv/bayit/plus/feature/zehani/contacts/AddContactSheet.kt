package tv.bayit.plus.feature.zehani.contacts

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import tv.bayit.plus.designsystem.component.GlassButton
import tv.bayit.plus.designsystem.component.GlassChip
import tv.bayit.plus.designsystem.component.GlassTextField
import tv.bayit.plus.designsystem.theme.DesignTokens

private val RELATIONSHIPS = listOf("grandparent", "parent", "aunt/uncle", "sibling", "other")
private val LANGUAGES = listOf("he", "en", "es", "fr", "ru", "ar", "yi", "de", "pt", "it")

@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
internal fun AddContactSheet(
    onDismiss: () -> Unit,
    onSave: (displayName: String, phone: String, relationship: String, language: String, pin: String) -> Unit,
) {
    var name by rememberSaveable { mutableStateOf("") }
    var phone by rememberSaveable { mutableStateOf("") }
    var pin by rememberSaveable { mutableStateOf("") }
    var relationship by rememberSaveable { mutableStateOf("grandparent") }
    var language by rememberSaveable { mutableStateOf("he") }

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true),
        containerColor = DesignTokens.Colors.Glass.bg,
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(DesignTokens.Spacing.base)
                .verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md),
        ) {
            Text(
                text = "Add Contact",
                style = MaterialTheme.typography.titleMedium,
                color = DesignTokens.Colors.Text.primary,
                fontWeight = FontWeight.SemiBold,
            )
            GlassTextField(value = name, onValueChange = { name = it }, label = "Name")
            GlassTextField(
                value = phone,
                onValueChange = { phone = it },
                label = "Phone",
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
            )
            GlassTextField(
                value = pin,
                onValueChange = { pin = it },
                label = "PIN",
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.NumberPassword),
                visualTransformation = PasswordVisualTransformation(),
            )
            Text(
                text = "Relationship",
                style = MaterialTheme.typography.bodySmall,
                color = DesignTokens.Colors.Text.muted,
            )
            FlowRow(horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.xs)) {
                RELATIONSHIPS.forEach { r ->
                    GlassChip(label = r, isSelected = relationship == r, onClick = { relationship = r })
                }
            }
            Text(
                text = "Language",
                style = MaterialTheme.typography.bodySmall,
                color = DesignTokens.Colors.Text.muted,
            )
            FlowRow(horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.xs)) {
                LANGUAGES.forEach { l ->
                    GlassChip(label = l, isSelected = language == l, onClick = { language = l })
                }
            }
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md),
            ) {
                GlassButton(text = "Cancel", onClick = onDismiss, isPrimary = false, modifier = Modifier.weight(1f))
                GlassButton(
                    text = "Save",
                    onClick = {
                        if (name.isNotBlank() && phone.isNotBlank() && pin.isNotBlank()) {
                            onSave(name, phone, relationship, language, pin)
                        }
                    },
                    modifier = Modifier.weight(1f),
                )
            }
        }
    }
}
