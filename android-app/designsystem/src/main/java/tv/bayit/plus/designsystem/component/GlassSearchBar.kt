package tv.bayit.plus.designsystem.component

import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.Icon
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import tv.bayit.plus.designsystem.i18n.bayitString
import tv.bayit.plus.designsystem.theme.DesignTokens

@Composable
fun GlassSearchBar(
    query: String,
    onQueryChange: (String) -> Unit,
    modifier: Modifier = Modifier,
    placeholder: String? = null,
) {
    val placeholderText = placeholder ?: bayitString("search.placeholder")
    OutlinedTextField(
        value = query,
        onValueChange = onQueryChange,
        modifier = modifier
            .fillMaxWidth()
            .heightIn(min = DesignTokens.TouchTarget.minimum),
        placeholder = { Text(placeholderText) },
        leadingIcon = {
            Icon(
                imageVector = Icons.Default.Search,
                contentDescription = null,
                tint = DesignTokens.Colors.Text.muted,
            )
        },
        singleLine = true,
        shape = RoundedCornerShape(DesignTokens.Radius.full),
        colors = OutlinedTextFieldDefaults.colors(
            focusedTextColor = DesignTokens.Colors.Text.primary,
            unfocusedTextColor = DesignTokens.Colors.Text.secondary,
            focusedContainerColor = DesignTokens.Colors.Glass.bg,
            unfocusedContainerColor = DesignTokens.Colors.Glass.bgLight,
            focusedBorderColor = DesignTokens.Colors.Glass.borderFocus,
            unfocusedBorderColor = DesignTokens.Colors.Glass.border,
        ),
    )
}
