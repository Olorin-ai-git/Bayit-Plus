package tv.bayit.plus.feature.auth.splash

import android.media.MediaPlayer
import androidx.compose.animation.core.*
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.delay
import tv.bayit.plus.designsystem.theme.DesignTokens

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
    val slogan = when (currentLanguage) {
        "he", "iw" -> "הבית שלך. בכל מקום."
        "es" -> "Tu Casa. En Todas Partes."
        "zh" -> "您的家，随处可及。"
        "fr" -> "Votre Maison. Partout."
        "it" -> "La Tua Casa. Ovunque."
        "hi" -> "आपका घर। कहीं भी।"
        "ta" -> "உங்கள் வீடு. எங்கும்."
        "bn" -> "আপনার বাড়ি। যেকোনো জায়গায়।"
        "ja" -> "あなたの家、どこでも。"
        else -> "Your Home. Anywhere."
    }

    val audioFileName = when (currentLanguage) {
        "he", "iw" -> "bayit_intro_hebrew"
        else -> "bayit_intro_english"
    }
    val audioResId = context.resources.getIdentifier(audioFileName, "raw", context.packageName)

    // Determine if current language is Hebrew (RTL)
    val isHebrew = currentLanguage in listOf("he", "iw")

    // For Hebrew (RTL): +בית - "+" from left, "בית" from right
    // For English (LTR): Bayit+ - "Bayit" from left, "+" from right
    val wordOffset by animateFloatAsState(
        targetValue = if (showTextAnimation) 0f else if (isHebrew) 300f else -300f,
        animationSpec = tween(durationMillis = 600, easing = FastOutSlowInEasing),
        label = "wordSlide"
    )

    val plusOffset by animateFloatAsState(
        targetValue = if (showTextAnimation) 0f else if (isHebrew) -300f else 300f,
        animationSpec = tween(durationMillis = 600, easing = FastOutSlowInEasing),
        label = "plusSlide"
    )

    val logoAlpha by animateFloatAsState(
        targetValue = if (showLogo) 1f else 0f,
        animationSpec = tween(durationMillis = 800),
        label = "logoAlpha"
    )

    val logoScale by animateFloatAsState(
        targetValue = if (showLogo) 1f else 0.85f,
        animationSpec = tween(durationMillis = 800),
        label = "logoScale"
    )

    val sloganAlpha by animateFloatAsState(
        targetValue = if (showSlogan) 1f else 0f,
        animationSpec = tween(durationMillis = 600),
        label = "sloganAlpha"
    )

    val screenAlpha by animateFloatAsState(
        targetValue = if (fadeOut) 0f else 1f,
        animationSpec = tween(durationMillis = 500),
        label = "screenAlpha"
    )

    DisposableEffect(Unit) {
        onDispose {
            mediaPlayer?.release()
        }
    }

    Box(
        modifier = modifier
            .fillMaxSize()
            .background(Color.Black)
            .alpha(screenAlpha)
            .clickable {
                if (!fadeOut && !skipRequested) {
                    skipRequested = true
                    fadeOut = true
                }
            }
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(DesignTokens.Spacing.xl),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Spacer(modifier = Modifier.weight(1f))

            Column(
                modifier = Modifier
                    .alpha(logoAlpha)
                    .graphicsLayer(
                        scaleX = logoScale,
                        scaleY = logoScale
                    ),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md)
            ) {
                // Logo Image
                Image(
                    painter = painterResource(id = tv.bayit.plus.feature.auth.R.drawable.splash_logo),
                    contentDescription = "Bayit+ Logo",
                    modifier = Modifier
                        .width(120.dp)
                        .height(60.dp),
                    contentScale = ContentScale.Fit
                )

                // Animated text sliding in from opposite directions
                // Hebrew (RTL): +בית - "+" from left, "בית" from right
                // English (LTR): Bayit+ - "Bayit" from left, "+" from right
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.Center
                ) {
                    if (isHebrew) {
                        // Hebrew: + comes first (from left)
                        Text(
                            text = "+",
                            color = DesignTokens.Colors.Primary.base,
                            fontSize = DesignTokens.FontSize.display,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.offset(x = plusOffset.dp)
                        )
                        // Hebrew: בית comes second (from right)
                        Text(
                            text = "בית",
                            color = Color.White,
                            fontSize = DesignTokens.FontSize.display,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.offset(x = wordOffset.dp)
                        )
                    } else {
                        // English: Bayit comes first (from left)
                        Text(
                            text = "Bayit",
                            color = Color.White,
                            fontSize = DesignTokens.FontSize.display,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.offset(x = wordOffset.dp)
                        )
                        // English: + comes second (from right)
                        Text(
                            text = "+",
                            color = DesignTokens.Colors.Primary.base,
                            fontSize = DesignTokens.FontSize.display,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.offset(x = plusOffset.dp)
                        )
                    }
                }
            }

            Box(
                modifier = Modifier
                    .alpha(sloganAlpha)
                    .padding(top = DesignTokens.Spacing.xl)
            ) {
                Text(
                    text = slogan,
                    style = MaterialTheme.typography.headlineSmall.copy(
                        brush = Brush.horizontalGradient(
                            colors = listOf(
                                DesignTokens.Colors.Primary.light,
                                DesignTokens.Colors.Primary.base
                            )
                        )
                    ),
                    fontWeight = FontWeight.Medium,
                    textAlign = TextAlign.Center
                )
            }

            Spacer(modifier = Modifier.weight(1f))

            // "Powered by Olorin.ai" with dark purple "ai"
            Text(
                text = buildAnnotatedString {
                    withStyle(style = SpanStyle(color = DesignTokens.Colors.Text.muted)) {
                        append("Powered by Olorin")
                    }
                    withStyle(style = SpanStyle(color = Color(0xFF6B46C1))) { // Dark purple
                        append(".ai")
                    }
                },
                style = MaterialTheme.typography.bodySmall,
                modifier = Modifier
                    .alpha(logoAlpha)
                    .padding(bottom = DesignTokens.Spacing.lg)
            )
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
        showTextAnimation = true  // Trigger slide-in animation

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

@Composable
private fun Modifier.graphicsLayer(
    scaleX: Float = 1f,
    scaleY: Float = 1f
): Modifier = this.scale(scaleX = scaleX, scaleY = scaleY)
