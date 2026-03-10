package tv.bayit.plus.feature.auth.splash

import android.media.MediaPlayer
import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.platform.LocalContext
import tv.bayit.plus.designsystem.i18n.bayitString
import kotlinx.coroutines.delay

@Composable
fun SplashRoute(onFinished: () -> Unit, modifier: Modifier = Modifier) {
    SplashScreen(onFinished = onFinished, modifier = modifier)
}

@Composable
internal fun SplashScreen(onFinished: () -> Unit, modifier: Modifier = Modifier) {
    var showLogo by remember { mutableStateOf(false) }
    var showSlogan by remember { mutableStateOf(false) }
    var showTextAnimation by remember { mutableStateOf(false) }
    var fadeOut by remember { mutableStateOf(false) }
    var skipRequested by remember { mutableStateOf(false) }
    val context = LocalContext.current
    var mediaPlayer by remember { mutableStateOf<MediaPlayer?>(null) }

    val currentLanguage = java.util.Locale.getDefault().language
    val slogan = bayitString("splash.slogan")

    val audioFileName = when (currentLanguage) {
        "he", "iw" -> "bayit_intro_hebrew"
        else -> "bayit_intro_english"
    }
    val audioResId = context.resources.getIdentifier(audioFileName, "raw", context.packageName)

    val isHebrew = currentLanguage in listOf("he", "iw")
    val splashContentDescription = bayitString("splash.tapToSkip")

    val wordOffset by animateFloatAsState(
        targetValue = if (showTextAnimation) 0f else if (isHebrew) 300f else -300f,
        animationSpec = tween(durationMillis = 600, easing = FastOutSlowInEasing),
        label = "wordSlide",
    )

    val plusOffset by animateFloatAsState(
        targetValue = if (showTextAnimation) 0f else if (isHebrew) -300f else 300f,
        animationSpec = tween(durationMillis = 600, easing = FastOutSlowInEasing),
        label = "plusSlide",
    )

    val logoAlpha by animateFloatAsState(
        targetValue = if (showLogo) 1f else 0f,
        animationSpec = tween(durationMillis = 800),
        label = "logoAlpha",
    )

    val logoScale by animateFloatAsState(
        targetValue = if (showLogo) 1f else 0.85f,
        animationSpec = tween(durationMillis = 800),
        label = "logoScale",
    )

    val sloganAlpha by animateFloatAsState(
        targetValue = if (showSlogan) 1f else 0f,
        animationSpec = tween(durationMillis = 600),
        label = "sloganAlpha",
    )

    val screenAlpha by animateFloatAsState(
        targetValue = if (fadeOut) 0f else 1f,
        animationSpec = tween(durationMillis = 500),
        label = "screenAlpha",
    )

    DisposableEffect(Unit) {
        onDispose { mediaPlayer?.release() }
    }

    Box(
        modifier = modifier
            .fillMaxSize()
            .background(Color.Black)
            .alpha(screenAlpha)
            .semantics { contentDescription = splashContentDescription }
            .clickable {
                if (!fadeOut && !skipRequested) {
                    skipRequested = true
                    fadeOut = true
                }
            },
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(tv.bayit.plus.designsystem.theme.DesignTokens.Spacing.xl),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
        ) {
            Spacer(modifier = Modifier.weight(1f))
            SplashLogoBlock(
                logoAlpha = logoAlpha,
                logoScale = logoScale,
                isHebrew = isHebrew,
                wordOffset = wordOffset,
                plusOffset = plusOffset,
            )
            SplashSloganBlock(sloganAlpha = sloganAlpha, slogan = slogan)
            Spacer(modifier = Modifier.weight(1f))
            SplashPoweredByText(logoAlpha = logoAlpha)
        }
    }

    LaunchedEffect(Unit) {
        if (audioResId != 0) {
            try {
                mediaPlayer = MediaPlayer.create(context, audioResId)?.apply {
                    setOnCompletionListener { it.release() }
                    start()
                }
            } catch (e: Exception) {
                // Audio playback is non-critical, continue without sound
            }
        }

        delay(300)
        showLogo = true

        delay(400)
        showTextAnimation = true

        delay(1200)
        showSlogan = true

        delay(5000)
        if (!skipRequested) {
            fadeOut = true
            delay(500)
            mediaPlayer?.release()
            onFinished()
        }
    }

    LaunchedEffect(skipRequested) {
        if (skipRequested) {
            delay(400)
            mediaPlayer?.release()
            onFinished()
        }
    }
}
