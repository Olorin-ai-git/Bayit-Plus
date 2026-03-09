package tv.bayit.plus.feature.tv.auth

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.tv.material3.Text
import tv.bayit.plus.designsystem.component.GlassLoadingIndicator
import tv.bayit.plus.designsystem.component.GlassTVButton
import tv.bayit.plus.designsystem.i18n.bayitString
import tv.bayit.plus.designsystem.theme.DesignTokens
import tv.bayit.plus.feature.tv.design.TVDesignTokens

/**
 * Entry-point composable for the device-code auth flow.
 *
 * Collects [TVAuthUiState] from [TVAuthViewModel] and calls [onAuthSuccess]
 * once the device is authorized.
 */
@Composable
fun TVAuthRoute(
    onAuthSuccess: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: TVAuthViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    LaunchedEffect(uiState) {
        if (uiState is TVAuthUiState.Authorized) {
            onAuthSuccess()
        }
    }

    TVAuthScreen(
        uiState = uiState,
        onRetry = viewModel::retryAuth,
        modifier = modifier,
    )
}

@Composable
internal fun TVAuthScreen(
    uiState: TVAuthUiState,
    onRetry: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Box(
        modifier = modifier
            .fillMaxSize()
            .padding(TVDesignTokens.Spacing.screenPadding),
        contentAlignment = Alignment.Center,
    ) {
        when (uiState) {
            is TVAuthUiState.Loading -> LoadingState()
            is TVAuthUiState.ShowCode -> ShowCodeState(uiState, onRetry)
            is TVAuthUiState.Authorized -> AuthorizedState()
            is TVAuthUiState.Expired -> ExpiredState(onRetry)
            is TVAuthUiState.Error -> ErrorState(uiState.message, onRetry)
        }
    }
}

@Composable
private fun LoadingState() {
    GlassLoadingIndicator()
}

@Composable
private fun ShowCodeState(
    state: TVAuthUiState.ShowCode,
    onManualLogin: () -> Unit,
) {
    val manualLoginLabel = bayitString("auth_device_manual_login")
    val instructionLabel = bayitString("auth_device_visit_uri")
    val remainingSeconds = remember(state.expiresAt) {
        ((state.expiresAt - System.currentTimeMillis()) / MILLIS_PER_SECOND).coerceAtLeast(0L)
    }
    val minutesRemaining = remainingSeconds / SECONDS_PER_MINUTE
    val secondsRemaining = remainingSeconds % SECONDS_PER_MINUTE
    val countdownText = remember(minutesRemaining, secondsRemaining) {
        "%d:%02d".format(minutesRemaining, secondsRemaining)
    }

    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Text(
            text = state.userCode,
            fontSize = TVDesignTokens.FontSize.heroLarge,
            fontWeight = FontWeight.Bold,
            color = DesignTokens.Colors.Text.primary,
            textAlign = TextAlign.Center,
        )
        Spacer(modifier = Modifier.height(DesignTokens.Spacing.xl))
        Text(
            text = instructionLabel,
            fontSize = TVDesignTokens.FontSize.bodyLarge,
            color = DesignTokens.Colors.Text.secondary,
            textAlign = TextAlign.Center,
        )
        Spacer(modifier = Modifier.height(DesignTokens.Spacing.sm))
        Text(
            text = state.verificationUri,
            fontSize = TVDesignTokens.FontSize.title,
            fontWeight = FontWeight.SemiBold,
            color = DesignTokens.Colors.Primary.light,
            textAlign = TextAlign.Center,
        )
        Spacer(modifier = Modifier.height(DesignTokens.Spacing.xxl))
        Text(
            text = countdownText,
            fontSize = TVDesignTokens.FontSize.hero,
            color = DesignTokens.Colors.Text.muted,
            textAlign = TextAlign.Center,
        )
        Spacer(modifier = Modifier.height(DesignTokens.Spacing.xxxl))
        GlassTVButton(
            text = manualLoginLabel,
            onClick = onManualLogin,
            isPrimary = false,
        )
    }
}

@Composable
private fun AuthorizedState() {
    val successLabel = bayitString("auth_device_authorized")

    Text(
        text = successLabel,
        fontSize = TVDesignTokens.FontSize.titleLarge,
        fontWeight = FontWeight.Bold,
        color = DesignTokens.Colors.Semantic.success,
        textAlign = TextAlign.Center,
    )
}

@Composable
private fun ExpiredState(onGetNewCode: () -> Unit) {
    val expiredLabel = bayitString("auth_device_code_expired")
    val newCodeLabel = bayitString("auth_device_get_new_code")

    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.xl),
    ) {
        Text(
            text = expiredLabel,
            fontSize = TVDesignTokens.FontSize.title,
            color = DesignTokens.Colors.Semantic.warning,
            textAlign = TextAlign.Center,
        )
        GlassTVButton(
            text = newCodeLabel,
            onClick = onGetNewCode,
        )
    }
}

@Composable
private fun ErrorState(message: String, onRetry: () -> Unit) {
    val retryLabel = bayitString("retry")

    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.xl),
    ) {
        Text(
            text = message,
            fontSize = TVDesignTokens.FontSize.bodyLarge,
            color = DesignTokens.Colors.Semantic.error,
            textAlign = TextAlign.Center,
        )
        GlassTVButton(
            text = retryLabel,
            onClick = onRetry,
        )
    }
}

private const val MILLIS_PER_SECOND = 1_000L
private const val SECONDS_PER_MINUTE = 60L
