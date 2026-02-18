package tv.bayit.plus.designsystem.component

import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.VisualTransformation
import tv.bayit.plus.designsystem.theme.DesignTokens

@Composable
fun GlassTextField(
    value: String,
    onValueChange: (String) -> Unit,
    modifier: Modifier = Modifier,
    label: String? = null,
    placeholder: String? = null,
    singleLine: Boolean = true,
    enabled: Boolean = true,
    keyboardOptions: KeyboardOptions = KeyboardOptions.Default,
    visualTransformation: VisualTransformation = VisualTransformation.None,
) {
    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        modifier = modifier.fillMaxWidth(),
        label = label?.let { { Text(it) } },
        placeholder = placeholder?.let { { Text(it) } },
        singleLine = singleLine,
        enabled = enabled,
        keyboardOptions = keyboardOptions,
        visualTransformation = visualTransformation,
        shape = RoundedCornerShape(DesignTokens.Radius.default),
        colors = OutlinedTextFieldDefaults.colors(
            focusedTextColor = DesignTokens.Colors.Text.primary,
            unfocusedTextColor = DesignTokens.Colors.Text.secondary,
            focusedContainerColor = DesignTokens.Colors.Glass.bg,
            unfocusedContainerColor = DesignTokens.Colors.Glass.bgLight,
            focusedBorderColor = DesignTokens.Colors.Glass.borderFocus,
            unfocusedBorderColor = DesignTokens.Colors.Glass.border,
            cursorColor = DesignTokens.Colors.Primary.light,
            focusedLabelColor = DesignTokens.Colors.Primary.light,
            unfocusedLabelColor = DesignTokens.Colors.Text.muted,
            focusedPlaceholderColor = DesignTokens.Colors.Text.muted,
            unfocusedPlaceholderColor = DesignTokens.Colors.Text.disabled,
        ),
    )
}
