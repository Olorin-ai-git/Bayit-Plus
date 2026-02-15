package tv.bayit.plus.feature.settings.support

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import tv.bayit.plus.designsystem.component.GlassButton
import tv.bayit.plus.designsystem.component.GlassCard
import tv.bayit.plus.designsystem.component.GlassLoadingIndicator
import tv.bayit.plus.designsystem.component.GlassTextField
import tv.bayit.plus.designsystem.component.GlassTopBar
import tv.bayit.plus.designsystem.theme.DesignTokens

@Composable
fun SupportRoute(
    onNavigateBack: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: SupportViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    SupportScreen(
        uiState = uiState,
        onNavigateBack = onNavigateBack,
        onSubjectChange = viewModel::updateSubject,
        onMessageChange = viewModel::updateMessage,
        onSubmit = viewModel::submit,
        onReset = viewModel::resetForm,
        onRetry = viewModel::retryFromError,
        modifier = modifier,
    )
}

@Composable
internal fun SupportScreen(
    uiState: SupportUiState,
    onNavigateBack: () -> Unit,
    onSubjectChange: (String) -> Unit,
    onMessageChange: (String) -> Unit,
    onSubmit: () -> Unit,
    onReset: () -> Unit,
    onRetry: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(modifier = modifier.fillMaxSize()) {
        GlassTopBar(
            title = "Contact Support",
            navigationIcon = {
                IconButton(onClick = onNavigateBack) {
                    Icon(
                        Icons.AutoMirrored.Filled.ArrowBack,
                        contentDescription = "Back",
                        tint = DesignTokens.Colors.Text.primary,
                    )
                }
            },
        )

        Box(modifier = Modifier.fillMaxSize()) {
            when (uiState) {
                is SupportUiState.Input -> {
                    val isValid = uiState.subject.isNotBlank() && uiState.message.isNotBlank()
                    Column(
                        modifier = Modifier
                            .fillMaxSize()
                            .verticalScroll(rememberScrollState())
                            .padding(horizontal = DesignTokens.Spacing.xl),
                    ) {
                        Spacer(modifier = Modifier.height(DesignTokens.Spacing.xl))

                        GlassTextField(
                            value = uiState.subject,
                            onValueChange = onSubjectChange,
                            label = "Subject",
                            singleLine = true,
                        )

                        Spacer(modifier = Modifier.height(DesignTokens.Spacing.lg))

                        GlassTextField(
                            value = uiState.message,
                            onValueChange = onMessageChange,
                            label = "Message",
                            singleLine = false,
                        )

                        Spacer(modifier = Modifier.height(DesignTokens.Spacing.xl))

                        GlassButton(
                            text = "Send",
                            onClick = onSubmit,
                            enabled = isValid,
                            modifier = Modifier.fillMaxWidth(),
                        )

                        Spacer(modifier = Modifier.height(DesignTokens.Spacing.xxl))
                    }
                }

                is SupportUiState.Sending -> GlassLoadingIndicator()

                is SupportUiState.Sent -> Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(horizontal = DesignTokens.Spacing.xl),
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    Spacer(modifier = Modifier.height(DesignTokens.Spacing.xxl))

                    GlassCard(modifier = Modifier.fillMaxWidth()) {
                        Column(modifier = Modifier.padding(DesignTokens.Spacing.xl)) {
                            Text(
                                text = "Message Sent",
                                style = MaterialTheme.typography.headlineSmall,
                                color = DesignTokens.Colors.Text.primary,
                            )

                            Spacer(modifier = Modifier.height(DesignTokens.Spacing.base))

                            Text(
                                text = "Thank you for contacting support. We'll respond within 24 hours.",
                                style = MaterialTheme.typography.bodyMedium,
                                color = DesignTokens.Colors.Text.secondary,
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(DesignTokens.Spacing.xl))

                    GlassButton(
                        text = "Send Another",
                        onClick = onReset,
                        modifier = Modifier.fillMaxWidth(),
                    )
                }

                is SupportUiState.Error -> Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(horizontal = DesignTokens.Spacing.xl),
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    Spacer(modifier = Modifier.height(DesignTokens.Spacing.xxl))

                    Text(
                        text = uiState.errorMessage,
                        style = MaterialTheme.typography.bodyMedium,
                        color = DesignTokens.Colors.Semantic.error,
                    )

                    Spacer(modifier = Modifier.height(DesignTokens.Spacing.xl))

                    GlassButton(
                        text = "Retry",
                        onClick = onRetry,
                        modifier = Modifier.fillMaxWidth(),
                    )
                }
            }
        }
    }
}
