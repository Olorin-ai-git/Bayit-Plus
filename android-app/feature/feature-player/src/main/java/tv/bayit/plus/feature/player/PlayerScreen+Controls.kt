package tv.bayit.plus.feature.player

import android.app.Activity
import android.content.pm.ActivityInfo
import android.content.Context
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import tv.bayit.plus.core.model.ImportedTrack
import tv.bayit.plus.core.model.SplitSubtitleLayout
import tv.bayit.plus.core.model.SubtitleEnglishMode
import tv.bayit.plus.core.model.SubtitleHebrewMode
import tv.bayit.plus.designsystem.component.GlassModal
import tv.bayit.plus.feature.player.live.AIFeaturesPanelState
import tv.bayit.plus.feature.player.live.ui.AILanguagePicker
import tv.bayit.plus.feature.player.subtitles.AISubtitlesPicker
import tv.bayit.plus.feature.player.subtitles.EnglishModePicker
import tv.bayit.plus.feature.player.subtitles.HebrewModePicker
import tv.bayit.plus.feature.player.subtitles.OpenSubtitlesDownload
import tv.bayit.plus.feature.player.subtitles.SplitSubtitleLanguagePicker
import tv.bayit.plus.feature.player.subtitles.SubtitleLanguagePicker

/**
 * Manages screen orientation and system-bar visibility based on [isFullscreen].
 * Restores defaults on disposal.
 */
@Composable
internal fun PlayerRouteOrientationEffect(isFullscreen: Boolean, context: Context) {
    DisposableEffect(isFullscreen) {
        val activity = context as? Activity
        val window = activity?.window
        val controller = window?.let { WindowCompat.getInsetsController(it, it.decorView) }
        if (isFullscreen) {
            activity?.requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE
            controller?.hide(WindowInsetsCompat.Type.systemBars())
            controller?.systemBarsBehavior = WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
        } else {
            activity?.requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED
            controller?.show(WindowInsetsCompat.Type.systemBars())
        }
        onDispose {
            controller?.show(WindowInsetsCompat.Type.systemBars())
            activity?.requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED
        }
    }
}

/**
 * Loads content into [viewModel] keyed on [contentId], and releases the player on disposal.
 * Also forces fullscreen on first composition so the player always opens in landscape.
 */
@Composable
internal fun PlayerRouteLifecycleEffects(
    viewModel: PlayerViewModel,
    contentId: String,
    contentType: String,
    resumePositionMs: Long,
) {
    DisposableEffect(contentId) {
        viewModel.loadContent(contentId, contentType, resumePositionMs)
        onDispose { viewModel.release() }
    }

    DisposableEffect(Unit) {
        viewModel.setFullscreen(true)
        onDispose { }
    }
}

/**
 * Language and subtitle picker sheets for the player screen.
 *
 * Shown conditionally based on [showLanguagePicker], [showSubtitlePicker],
 * [showSplitSubtitlePicker], and [showOpenSubtitles] flags.
 */
@Composable
internal fun PlayerScreenPickerSheets(
    extendedState: PlayerExtendedState,
    aiPanelState: AIFeaturesPanelState,
    showLanguagePicker: Boolean,
    showSubtitlePicker: Boolean,
    showSplitSubtitlePicker: Boolean,
    showOpenSubtitles: Boolean,
    onSelectLanguage: (String) -> Unit,
    onHideLanguagePicker: () -> Unit,
    onSelectSubtitleLanguage: (String) -> Unit,
    onHideSubtitlePicker: () -> Unit,
    onToggleSplitMode: () -> Unit,
    onShowOpenSubtitles: () -> Unit,
    onSelectPrimaryLanguage: (String) -> Unit,
    onSelectSecondaryLanguage: (String) -> Unit,
    onSelectSplitLayout: (SplitSubtitleLayout) -> Unit,
    onHideSplitSubtitlePicker: () -> Unit,
    onFetchExternalSubtitles: () -> Unit,
    onSelectExternalSubtitle: (ImportedTrack) -> Unit,
    onHideOpenSubtitles: () -> Unit,
    onSetHebrewMode: (SubtitleHebrewMode) -> Unit = {},
    onSetEnglishMode: (SubtitleEnglishMode) -> Unit = {},
) {
    if (showLanguagePicker) {
        AILanguagePicker(
            selectedLanguage = aiPanelState.selectedLanguage,
            onLanguageSelected = { lang ->
                onSelectLanguage(lang)
                onHideLanguagePicker()
            },
            onDismiss = onHideLanguagePicker,
        )
    }

    if (showSubtitlePicker) {
        GlassModal(onDismissRequest = onHideSubtitlePicker) {
            SubtitleLanguagePicker(
                selectedLanguage = extendedState.selectedSubtitleLanguage.orEmpty(),
                availableLanguages = extendedState.availableSubtitleLanguages,
                isSplitMode = extendedState.isSplitSubtitleMode,
                onLanguageSelected = { lang ->
                    onSelectSubtitleLanguage(lang)
                    onHideSubtitlePicker()
                },
                onSplitToggle = onToggleSplitMode,
                onOpenSubtitlesClick = onShowOpenSubtitles,
                onDismiss = onHideSubtitlePicker,
            )

            val selectedLang = extendedState.selectedSubtitleLanguage
            if (selectedLang == "he") {
                HebrewModePicker(
                    selectedMode = extendedState.hebrewMode,
                    onModeSelected = { mode ->
                        onSetHebrewMode(mode)
                        onHideSubtitlePicker()
                    },
                )
            } else if (selectedLang == "en") {
                EnglishModePicker(
                    selectedMode = extendedState.englishMode,
                    onModeSelected = { mode ->
                        onSetEnglishMode(mode)
                        onHideSubtitlePicker()
                    },
                )
            }
        }
    }

    if (showSplitSubtitlePicker) {
        GlassModal(onDismissRequest = onHideSplitSubtitlePicker) {
            SplitSubtitleLanguagePicker(
                primaryLanguage = extendedState.primarySubtitleLanguage.orEmpty(),
                secondaryLanguage = extendedState.secondarySubtitleLanguage.orEmpty(),
                availableLanguages = extendedState.availableSubtitleLanguages,
                layout = extendedState.splitSubtitleLayout,
                onPrimarySelected = onSelectPrimaryLanguage,
                onSecondarySelected = onSelectSecondaryLanguage,
                onLayoutSelected = onSelectSplitLayout,
                onDismiss = onHideSplitSubtitlePicker,
            )
        }
    }

    if (showOpenSubtitles) {
        GlassModal(onDismissRequest = onHideOpenSubtitles) {
            OpenSubtitlesDownload(
                tracks = extendedState.externalSubtitleTracks,
                isLoading = extendedState.isLoadingExternalSubtitles,
                onFetchExternal = onFetchExternalSubtitles,
                onTrackSelected = { track ->
                    onSelectExternalSubtitle(track)
                    onHideOpenSubtitles()
                },
                onDismiss = onHideOpenSubtitles,
            )
        }
    }
}
