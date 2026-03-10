package tv.bayit.plus.feature.byoc

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import tv.bayit.plus.designsystem.component.GlassButton
import tv.bayit.plus.designsystem.component.GlassCard
import tv.bayit.plus.designsystem.component.GlassLoadingIndicator
import tv.bayit.plus.designsystem.component.GlassTopBar
import tv.bayit.plus.designsystem.theme.DesignTokens
import tv.bayit.plus.designsystem.i18n.bayitString

@Composable
fun YouTubeAuthRoute(
    onNavigateBack: () -> Unit,
    onSuccess: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: YouTubeAuthViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    LaunchedEffect(Unit) { viewModel.startAuth() }
    LaunchedEffect(uiState) {
        if (uiState is YouTubeAuthUiState.Success) onSuccess()
    }

    YouTubeAuthScreen(
        uiState = uiState,
        onNavigateBack = onNavigateBack,
        onRetry = viewModel::retry,
        modifier = modifier,
    )
}

@Composable
internal fun YouTubeAuthScreen(
    uiState: YouTubeAuthUiState,
    onNavigateBack: () -> Unit,
    onRetry: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(modifier = modifier.fillMaxSize()) {
        GlassTopBar(
            title = bayitString("byoc.youtube.connectTitle"),
            navigationIcon = {
                IconButton(onClick = onNavigateBack) {
                    Icon(
                        Icons.AutoMirrored.Filled.ArrowBack,
                        contentDescription = bayitString("common.back"),
                        tint = DesignTokens.Colors.Text.primary,
                    )
                }
            },
        )
        when (uiState) {
            is YouTubeAuthUiState.Idle -> GlassLoadingIndicator()
            is YouTubeAuthUiState.WaitingForCode -> YouTubeDeviceCodeContent(
                userCode = uiState.userCode,
                verificationUrl = uiState.verificationUrl,
            )
            is YouTubeAuthUiState.Connecting -> YouTubeConnectingContent()
            is YouTubeAuthUiState.Success -> YouTubeSuccessContent()
            is YouTubeAuthUiState.Error -> YouTubeErrorContent(
                message = uiState.message,
                onRetry = onRetry,
            )
        }
    }
}

@Composable
private fun YouTubeDeviceCodeContent(userCode: String, verificationUrl: String) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(DesignTokens.Spacing.lg),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Text(
            text = bayitString("byoc.youtube.visitUrl"),
            style = MaterialTheme.typography.bodyLarge,
            color = DesignTokens.Colors.Text.secondary,
        )
        Spacer(modifier = Modifier.height(DesignTokens.Spacing.sm))
        Text(
            text = verificationUrl,
            style = MaterialTheme.typography.bodyMedium,
            color = DesignTokens.Colors.Primary.light,
        )
        Spacer(modifier = Modifier.height(DesignTokens.Spacing.lg))
        Text(
            text = bayitString("byoc.youtube.enterCode"),
            style = MaterialTheme.typography.bodyLarge,
            color = DesignTokens.Colors.Text.secondary,
        )
        Spacer(modifier = Modifier.height(DesignTokens.Spacing.sm))
        GlassCard(modifier = Modifier.padding(horizontal = DesignTokens.Spacing.xl)) {
            Text(
                text = userCode,
                style = MaterialTheme.typography.displayMedium,
                color = DesignTokens.Colors.Text.primary,
                textAlign = TextAlign.Center,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(DesignTokens.Spacing.lg),
            )
        }
        Spacer(modifier = Modifier.height(DesignTokens.Spacing.lg))
        GlassLoadingIndicator()
        Spacer(modifier = Modifier.height(DesignTokens.Spacing.md))
        Text(
            text = bayitString("byoc.youtube.waitingAuth"),
            style = MaterialTheme.typography.bodySmall,
            color = DesignTokens.Colors.Text.secondary,
        )
    }
}

@Composable
private fun YouTubeConnectingContent() {
    Column(
        modifier = Modifier.fillMaxSize(),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        GlassLoadingIndicator()
        Spacer(modifier = Modifier.height(DesignTokens.Spacing.md))
        Text(
            text = bayitString("byoc.youtube.connecting"),
            style = MaterialTheme.typography.bodyLarge,
            color = DesignTokens.Colors.Text.secondary,
        )
    }
}

@Composable
private fun YouTubeSuccessContent() {
    Column(
        modifier = Modifier.fillMaxSize(),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Text(
            text = bayitString("byoc.youtube.connected"),
            style = MaterialTheme.typography.headlineMedium,
            color = DesignTokens.Colors.Text.primary,
        )
    }
}

@Composable
private fun YouTubeErrorContent(message: String, onRetry: () -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(DesignTokens.Spacing.lg),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Text(
            text = message,
            style = MaterialTheme.typography.bodyLarge,
            color = DesignTokens.Colors.Semantic.error,
            textAlign = TextAlign.Center,
        )
        Spacer(modifier = Modifier.height(DesignTokens.Spacing.lg))
        GlassButton(text = bayitString("common.tryAgain"), onClick = onRetry)
    }
}
