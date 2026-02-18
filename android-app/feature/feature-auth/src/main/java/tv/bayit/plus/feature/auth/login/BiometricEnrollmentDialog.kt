package tv.bayit.plus.feature.auth.login

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import tv.bayit.plus.designsystem.component.GlassButton
import tv.bayit.plus.designsystem.i18n.bayitString
import tv.bayit.plus.designsystem.modifier.glassMorphism
import tv.bayit.plus.designsystem.theme.DesignTokens

@Composable
internal fun BiometricEnrollmentDialog(
    onEnable: () -> Unit,
    onDismiss: () -> Unit,
) {
    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Column(
            modifier = Modifier
                .padding(DesignTokens.Spacing.xl)
                .fillMaxWidth()
                .glassMorphism()
                .padding(DesignTokens.Spacing.lg),
            verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Text(
                text = bayitString("auth.biometricEnrollTitle"),
                style = MaterialTheme.typography.titleLarge,
                color = DesignTokens.Colors.Text.primary,
            )
            Text(
                text = bayitString("auth.biometricEnrollMessage"),
                style = MaterialTheme.typography.bodyMedium,
                color = DesignTokens.Colors.Text.secondary,
            )
            GlassButton(
                text = bayitString("auth.biometricEnrollEnable"),
                onClick = onEnable,
                isPrimary = true,
                modifier = Modifier.fillMaxWidth(),
            )
            TextButton(onClick = onDismiss) {
                Text(
                    text = bayitString("auth.biometricEnrollSkip"),
                    color = DesignTokens.Colors.Text.secondary,
                )
            }
        }
    }
}
