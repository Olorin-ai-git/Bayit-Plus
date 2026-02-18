package tv.bayit.plus.feature.voice.wizard

import android.Manifest
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import tv.bayit.plus.designsystem.component.*
import tv.bayit.plus.designsystem.i18n.bayitString
import tv.bayit.plus.designsystem.modifier.glassMorphism
import tv.bayit.plus.designsystem.theme.DesignTokens

private val MIC_BUTTON_SIZE = 96.dp
private val LANG_GRID_COLS = 2
private val SUPPORTED_LANGS = listOf("he", "en", "es", "fr", "it", "hi", "ja", "zh", "bn", "ta")

@Composable
fun VoiceWizardRoute(
    onComplete: () -> Unit, onNavigateBack: () -> Unit,
    modifier: Modifier = Modifier, viewModel: VoiceWizardViewModel = hiltViewModel(),
) {
    val currentStep by viewModel.currentStep.collectAsStateWithLifecycle()
    val selectedLanguage by viewModel.selectedLanguage.collectAsStateWithLifecycle()
    val calibrationResult by viewModel.calibrationResult.collectAsStateWithLifecycle()
    val isCalibrating by viewModel.isCalibrating.collectAsStateWithLifecycle()
    val permissionsGranted by viewModel.permissionsGranted.collectAsStateWithLifecycle()
    val error by viewModel.error.collectAsStateWithLifecycle()
    val isCompleted by viewModel.isCompleted.collectAsStateWithLifecycle()
    LaunchedEffect(isCompleted) { if (isCompleted) onComplete() }
    VoiceWizardScreen(currentStep, viewModel.getTotalSteps(), selectedLanguage, calibrationResult,
        isCalibrating, permissionsGranted, error, viewModel::onPermissionsResult,
        viewModel::selectLanguage, viewModel::startCalibration, viewModel::stopCalibration,
        viewModel::completeWizard, viewModel::nextStep, viewModel::previousStep,
        viewModel::dismissError, onNavigateBack, modifier)
}

@Composable
internal fun VoiceWizardScreen(
    currentStep: Int, totalSteps: Int, selectedLanguage: String, calibrationResult: Float?,
    isCalibrating: Boolean, permissionsGranted: Boolean, error: String?,
    onPermissionsResult: (Boolean) -> Unit, onSelectLanguage: (String) -> Unit,
    onStartCalibration: () -> Unit, onStopCalibration: () -> Unit, onCompleteWizard: () -> Unit,
    onNextStep: () -> Unit, onPreviousStep: () -> Unit, onDismissError: () -> Unit,
    onNavigateBack: () -> Unit, modifier: Modifier = Modifier,
) {
    Column(modifier = modifier.fillMaxSize()) {
        GlassTopBar(title = bayitString("voiceWizard.title"))
        Column(Modifier.fillMaxSize().padding(DesignTokens.Spacing.base),
            verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.xl)) {
            LinearProgressIndicator(progress = { (currentStep + 1) / totalSteps.toFloat() },
                modifier = Modifier.fillMaxWidth(), color = DesignTokens.Colors.Primary.base)
            Text(bayitString("voiceWizard.stepProgress", mapOf(
                "step" to (currentStep + 1).toString(), "total" to totalSteps.toString())),
                style = MaterialTheme.typography.labelMedium, color = DesignTokens.Colors.Text.muted)
            when (currentStep) {
                0 -> PermissionStep(permissionsGranted, onPermissionsResult)
                1 -> LanguageStep(selectedLanguage, onSelectLanguage)
                2 -> CalibrationStep(isCalibrating, calibrationResult, onStartCalibration, onStopCalibration)
                3 -> CompletionStep()
            }
            Spacer(Modifier.weight(1f))
            error?.let { Text(it, color = DesignTokens.Colors.Semantic.error, style = MaterialTheme.typography.bodyMedium) }
            WizardNavButtons(currentStep, totalSteps, permissionsGranted, onPreviousStep, onNextStep, onCompleteWizard)
        }
    }
}

@Composable
private fun PermissionStep(granted: Boolean, onResult: (Boolean) -> Unit) {
    val launcher = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { onResult(it) }
    GlassCard(modifier = Modifier.fillMaxWidth()) {
        Column(horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md)) {
            Text(bayitString("voiceWizard.permission.title"), style = MaterialTheme.typography.titleLarge,
                color = DesignTokens.Colors.Text.primary, fontWeight = FontWeight.Bold, textAlign = TextAlign.Center)
            Text(bayitString("voiceWizard.permission.description"), style = MaterialTheme.typography.bodyMedium,
                color = DesignTokens.Colors.Text.secondary, textAlign = TextAlign.Center)
            Spacer(Modifier.height(DesignTokens.Spacing.sm))
            if (granted) {
                Text(bayitString("voiceWizard.permission.granted"), style = MaterialTheme.typography.bodyLarge,
                    color = DesignTokens.Colors.Semantic.success, fontWeight = FontWeight.SemiBold)
            } else {
                GlassButton(text = bayitString("voiceWizard.permission.requestButton"),
                    onClick = { launcher.launch(Manifest.permission.RECORD_AUDIO) })
            }
        }
    }
}

@Composable
private fun LanguageStep(selected: String, onSelect: (String) -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md)) {
        Text(bayitString("voiceWizard.language.title"), style = MaterialTheme.typography.titleLarge,
            color = DesignTokens.Colors.Text.primary, fontWeight = FontWeight.Bold)
        Text(bayitString("voiceWizard.language.description"), style = MaterialTheme.typography.bodyMedium,
            color = DesignTokens.Colors.Text.secondary)
        LazyVerticalGrid(columns = GridCells.Fixed(LANG_GRID_COLS),
            horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm),
            verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm)) {
            items(SUPPORTED_LANGS) { lang ->
                val sel = lang == selected
                GlassCard(modifier = Modifier.fillMaxWidth().clickable { onSelect(lang) }.glassMorphism(
                    cornerRadius = DesignTokens.Radius.md,
                    backgroundColor = if (sel) DesignTokens.Colors.Primary.base else DesignTokens.Colors.Background.elevated)
                ) {
                    Text(bayitString("voiceWizard.language.$lang"), style = MaterialTheme.typography.bodyLarge,
                        color = if (sel) DesignTokens.Colors.Text.primary else DesignTokens.Colors.Text.secondary,
                        fontWeight = if (sel) FontWeight.Bold else FontWeight.Normal,
                        textAlign = TextAlign.Center, modifier = Modifier.fillMaxWidth())
                }
            }
        }
    }
}

@Composable
private fun CalibrationStep(calibrating: Boolean, result: Float?, onStart: () -> Unit, onStop: () -> Unit) {
    Column(horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.xl)) {
        GlassCard(modifier = Modifier.fillMaxWidth()) {
            Column(horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md)) {
                Text(bayitString("voiceWizard.calibration.title"), style = MaterialTheme.typography.titleLarge,
                    color = DesignTokens.Colors.Text.primary, fontWeight = FontWeight.Bold, textAlign = TextAlign.Center)
                Text(bayitString("voiceWizard.calibration.description"), style = MaterialTheme.typography.bodyMedium,
                    color = DesignTokens.Colors.Text.secondary, textAlign = TextAlign.Center)
            }
        }
        if (calibrating) {
            GlassSpinner(size = SpinnerSize.LARGE)
            Text(bayitString("voiceWizard.calibration.listening"),
                color = DesignTokens.Colors.Text.secondary, style = MaterialTheme.typography.bodyMedium)
            GlassButton(text = bayitString("voiceWizard.calibration.stopButton"), onClick = onStop, isPrimary = false)
        } else {
            Box(modifier = Modifier.size(MIC_BUTTON_SIZE).clickable { onStart() }.glassMorphism(
                cornerRadius = DesignTokens.Radius.full, backgroundColor = DesignTokens.Colors.Primary.base),
                contentAlignment = Alignment.Center) {
                Text(bayitString("voiceWizard.calibration.micButton"),
                    color = DesignTokens.Colors.Text.primary, fontWeight = FontWeight.Bold)
            }
            Text(bayitString("voiceWizard.calibration.tapToStart"),
                color = DesignTokens.Colors.Text.secondary, style = MaterialTheme.typography.bodyMedium)
        }
        result?.let { confidence ->
            GlassCard(modifier = Modifier.fillMaxWidth()) {
                Column(horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm)) {
                    Text(bayitString("voiceWizard.calibration.resultTitle"),
                        style = MaterialTheme.typography.titleMedium,
                        color = DesignTokens.Colors.Text.primary, fontWeight = FontWeight.SemiBold)
                    Text(bayitString("voiceWizard.calibration.confidenceLabel",
                        mapOf("value" to "%.0f".format(confidence * 100))),
                        style = MaterialTheme.typography.bodyLarge,
                        color = DesignTokens.Colors.Primary.light, fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}

@Composable
private fun CompletionStep() {
    GlassCard(modifier = Modifier.fillMaxWidth()) {
        Column(horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md)) {
            Text(bayitString("voiceWizard.complete.title"), style = MaterialTheme.typography.titleLarge,
                color = DesignTokens.Colors.Primary.light, fontWeight = FontWeight.Bold, textAlign = TextAlign.Center)
            Text(bayitString("voiceWizard.complete.message"), style = MaterialTheme.typography.bodyMedium,
                color = DesignTokens.Colors.Text.secondary, textAlign = TextAlign.Center)
        }
    }
}

@Composable
private fun WizardNavButtons(
    step: Int, total: Int, permGranted: Boolean, onBack: () -> Unit, onNext: () -> Unit, onComplete: () -> Unit,
) {
    val isLast = step == total - 1
    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm)) {
        if (step > 0) GlassButton(text = bayitString("voiceWizard.buttons.back"), onClick = onBack,
            isPrimary = false, modifier = Modifier.weight(1f))
        GlassButton(text = bayitString(if (isLast) "voiceWizard.buttons.getStarted" else "voiceWizard.buttons.next"),
            onClick = if (isLast) onComplete else onNext, enabled = step != 0 || permGranted,
            modifier = if (step > 0) Modifier.weight(1f) else Modifier.fillMaxWidth())
    }
}
