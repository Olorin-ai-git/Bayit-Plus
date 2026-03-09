// # DEMO-ONLY
package tv.bayit.plus.feature.onboarding.demos

import android.Manifest
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.core.content.ContextCompat
import tv.bayit.plus.designsystem.component.GlassButton
import tv.bayit.plus.designsystem.component.GlassCard
import tv.bayit.plus.designsystem.theme.DesignTokens
import tv.bayit.plus.feature.onboarding.R

private const val PREVIEW_ASPECT_RATIO = 3f / 4f

private sealed interface CameraState {
    data object NeedsPermission : CameraState
    data object PermissionGranted : CameraState
}

@Composable
fun ZehAniDemoComposable(
    onClose: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val context = LocalContext.current
    var cameraState by remember {
        val hasPermission = ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.CAMERA,
        ) == android.content.pm.PackageManager.PERMISSION_GRANTED
        mutableStateOf<CameraState>(
            if (hasPermission) CameraState.PermissionGranted else CameraState.NeedsPermission,
        )
    }

    val permissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestPermission(),
    ) { granted ->
        cameraState = if (granted) CameraState.PermissionGranted else CameraState.NeedsPermission
    }

    Column(
        modifier = modifier
            .fillMaxSize()
            .background(DesignTokens.Colors.Background.primary),
    ) {
        DemoTopBar(
            label = stringResource(R.string.demo_banner_label),
            onClose = onClose,
        )

        Spacer(modifier = Modifier.height(DesignTokens.Spacing.xl))

        AnimatedContent(
            targetState = cameraState,
            label = "camera_state",
            transitionSpec = { fadeIn() togetherWith fadeOut() },
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = DesignTokens.Spacing.xxl),
        ) { state ->
            when (state) {
                CameraState.NeedsPermission -> PermissionPrompt(
                    onRequestPermission = {
                        permissionLauncher.launch(Manifest.permission.CAMERA)
                    },
                )
                CameraState.PermissionGranted -> CameraPreviewWithVocab()
            }
        }

        Spacer(modifier = Modifier.weight(1f))

        GlassButton(
            text = stringResource(R.string.demo_close),
            onClick = onClose,
            isPrimary = false,
            modifier = Modifier
                .fillMaxWidth()
                .padding(DesignTokens.Spacing.base),
        )
    }
}

@Composable
private fun PermissionPrompt(onRequestPermission: () -> Unit) {
    GlassCard(modifier = Modifier.fillMaxWidth()) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md),
        ) {
            Text(
                text = stringResource(R.string.demo_zeh_ani_camera_needed),
                style = MaterialTheme.typography.bodyLarge,
                color = DesignTokens.Colors.Text.secondary,
                textAlign = TextAlign.Center,
                modifier = Modifier.fillMaxWidth(),
            )
            GlassButton(
                text = stringResource(R.string.demo_zeh_ani_grant_camera),
                onClick = onRequestPermission,
            )
        }
    }
}

@Composable
private fun CameraPreviewWithVocab() {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md),
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .aspectRatio(PREVIEW_ASPECT_RATIO)
                .clip(RoundedCornerShape(DesignTokens.Radius.lg))
                .background(
                    Brush.verticalGradient(
                        listOf(
                            DesignTokens.Colors.Glass.purpleLight,
                            DesignTokens.Colors.Background.elevated,
                            DesignTokens.Colors.Glass.purpleStrong,
                        ),
                    ),
                ),
            contentAlignment = Alignment.Center,
        ) {
            Text(
                text = stringResource(R.string.demo_zeh_ani_preview_label),
                style = MaterialTheme.typography.titleMedium,
                color = DesignTokens.Colors.Text.secondary,
            )

            VocabularyHighlightOverlay(
                modifier = Modifier.align(Alignment.BottomCenter),
            )
        }

        Text(
            text = stringResource(R.string.demo_zeh_ani_no_face),
            style = MaterialTheme.typography.bodyMedium,
            color = DesignTokens.Colors.Text.muted,
            textAlign = TextAlign.Center,
        )
    }
}

@Composable
private fun VocabularyHighlightOverlay(modifier: Modifier = Modifier) {
    val shape = RoundedCornerShape(DesignTokens.Radius.md)
    Box(
        modifier = modifier.fillMaxWidth().padding(DesignTokens.Spacing.md).clip(shape)
            .background(DesignTokens.Colors.Glass.bgStrong)
            .border(1.dp, DesignTokens.Colors.Primary.light, shape).padding(DesignTokens.Spacing.md),
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.xs),
            modifier = Modifier.fillMaxWidth(),
        ) {
            Text(stringResource(R.string.demo_zeh_ani_vocab_label), style = MaterialTheme.typography.labelSmall, color = DesignTokens.Colors.Primary.light, fontWeight = FontWeight.Bold)
            Text(stringResource(R.string.demo_zeh_ani_vocab_word), style = MaterialTheme.typography.headlineSmall, color = DesignTokens.Colors.Text.primary, fontWeight = FontWeight.Bold)
            Text(stringResource(R.string.demo_zeh_ani_vocab_transliteration), style = MaterialTheme.typography.bodyLarge, color = DesignTokens.Colors.Text.secondary)
            Text(stringResource(R.string.demo_zeh_ani_vocab_translation), style = MaterialTheme.typography.bodyMedium, color = DesignTokens.Colors.Text.muted)
        }
    }
}
