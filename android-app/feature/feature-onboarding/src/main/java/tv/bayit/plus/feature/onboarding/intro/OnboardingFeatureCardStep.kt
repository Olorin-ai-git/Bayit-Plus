package tv.bayit.plus.feature.onboarding.intro

import androidx.annotation.DrawableRes
import androidx.annotation.StringRes
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.slideInVertically
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.delay
import tv.bayit.plus.designsystem.component.GlassButton
import tv.bayit.plus.designsystem.theme.DesignTokens
import tv.bayit.plus.feature.onboarding.R

data class FeatureCardData(
    @DrawableRes val imageRes: Int,
    @StringRes val titleRes: Int,
    val titleArgs: List<String> = emptyList(),
    @StringRes val subtitleRes: Int,
    val pillResIds: List<Int>,
)

val FEATURE_CARDS = listOf(
    FeatureCardData(
        imageRes = R.drawable.onboarding_ai_language,
        titleRes = R.string.onboarding_ai_language_title,
        subtitleRes = R.string.onboarding_ai_language_subtitle,
        pillResIds = listOf(
            R.string.onboarding_ai_language_dubbing,
            R.string.onboarding_ai_language_subtitles,
            R.string.onboarding_ai_language_engrew,
        ),
    ),
    FeatureCardData(
        imageRes = R.drawable.onboarding_pause_ask,
        titleRes = R.string.onboarding_pause_ask_title,
        subtitleRes = R.string.onboarding_pause_ask_subtitle,
        pillResIds = listOf(R.string.onboarding_pause_ask_pill),
    ),
    FeatureCardData(
        imageRes = R.drawable.onboarding_interactive,
        titleRes = R.string.onboarding_interactive_title,
        subtitleRes = R.string.onboarding_interactive_subtitle,
        pillResIds = listOf(
            R.string.onboarding_interactive_moments,
            R.string.onboarding_interactive_trivia,
        ),
    ),
    FeatureCardData(
        imageRes = R.drawable.onboarding_catchup_byoc,
        titleRes = R.string.onboarding_never_miss_title,
        subtitleRes = R.string.onboarding_never_miss_subtitle,
        pillResIds = listOf(
            R.string.onboarding_never_miss_catchup,
            R.string.onboarding_never_miss_byoc,
        ),
    ),
    FeatureCardData(
        imageRes = R.drawable.onboarding_zeh_ani,
        titleRes = R.string.onboarding_zeh_ani_title,
        subtitleRes = R.string.onboarding_zeh_ani_subtitle,
        pillResIds = listOf(R.string.onboarding_zeh_ani_pill),
    ),
)

@Composable
fun OnboardingFeatureCardStep(
    card: FeatureCardData,
    languageName: String,
    onContinue: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val infiniteTransition = rememberInfiniteTransition(label = "ken_burns")
    val scale by infiniteTransition.animateFloat(
        initialValue = 1f,
        targetValue = 1.08f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 30000),
            repeatMode = RepeatMode.Reverse,
        ),
        label = "bg_scale",
    )

    var appeared by remember { mutableStateOf(false) }
    LaunchedEffect(card) {
        appeared = false
        delay(200)
        appeared = true
    }

    Box(modifier = modifier.fillMaxSize()) {
        Image(
            painter = painterResource(card.imageRes),
            contentDescription = null,
            contentScale = ContentScale.Crop,
            alignment = Alignment.TopCenter,
            modifier = Modifier
                .fillMaxSize()
                .graphicsLayer { scaleX = scale; scaleY = scale },
        )

        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    Brush.verticalGradient(
                        colorStops = arrayOf(
                            0.0f to Color.Transparent,
                            0.45f to Color.Transparent,
                            0.58f to Color.Black.copy(alpha = 0.4f),
                            0.70f to Color.Black.copy(alpha = 0.85f),
                            0.80f to Color.Black.copy(alpha = 0.96f),
                            0.88f to Color.Black,
                        ),
                    ),
                ),
        )

        AnimatedVisibility(
            visible = appeared,
            enter = fadeIn(tween(600)) + slideInVertically(tween(600)) { 80 },
            modifier = Modifier.align(Alignment.BottomCenter),
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = DesignTokens.Spacing.xl)
                    .padding(bottom = 50.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md),
            ) {
                val titleText = if (card.titleArgs.isNotEmpty()) {
                    stringResource(card.titleRes, *card.titleArgs.toTypedArray())
                } else {
                    stringResource(card.titleRes)
                }

                Text(
                    text = if (card == FEATURE_CARDS[0]) {
                        stringResource(card.titleRes, languageName)
                    } else {
                        titleText
                    },
                    fontSize = 24.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.White,
                    textAlign = TextAlign.Center,
                )

                Text(
                    text = stringResource(card.subtitleRes),
                    fontSize = 14.sp,
                    color = Color.White.copy(alpha = 0.7f),
                    textAlign = TextAlign.Center,
                )

                Row(
                    horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm),
                ) {
                    card.pillResIds.forEach { pillRes ->
                        Text(
                            text = stringResource(pillRes),
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Medium,
                            color = Color.White,
                            modifier = Modifier
                                .clip(RoundedCornerShape(50))
                                .background(Color.White.copy(alpha = 0.15f))
                                .padding(
                                    horizontal = DesignTokens.Spacing.md,
                                    vertical = DesignTokens.Spacing.sm,
                                ),
                        )
                    }
                }

                GlassButton(
                    text = stringResource(R.string.onboarding_continue),
                    onClick = onContinue,
                    isPrimary = true,
                    icon = Icons.AutoMirrored.Filled.ArrowForward,
                    modifier = Modifier.padding(top = 4.dp),
                )
            }
        }
    }
}
