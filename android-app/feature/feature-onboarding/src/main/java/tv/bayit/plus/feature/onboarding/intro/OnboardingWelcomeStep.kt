package tv.bayit.plus.feature.onboarding.intro

import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
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
import tv.bayit.plus.designsystem.component.GlassButton
import tv.bayit.plus.designsystem.theme.DesignTokens
import tv.bayit.plus.feature.onboarding.R

private data class LanguageOption(
    val code: String,
    val displayName: String,
    val flag: String,
)

private val LANGUAGES = listOf(
    LanguageOption("en", "English", "\uD83C\uDDFA\uD83C\uDDF8"),
    LanguageOption("he", "\u05E2\u05D1\u05E8\u05D9\u05EA", "\uD83C\uDDEE\uD83C\uDDF1"),
    LanguageOption("es", "Espa\u00F1ol", "\uD83C\uDDEA\uD83C\uDDF8"),
    LanguageOption("fr", "Fran\u00E7ais", "\uD83C\uDDEB\uD83C\uDDF7"),
    LanguageOption("zh", "\u4E2D\u6587", "\uD83C\uDDE8\uD83C\uDDF3"),
    LanguageOption("it", "Italiano", "\uD83C\uDDEE\uD83C\uDDF9"),
    LanguageOption("hi", "\u0939\u093F\u0928\u094D\u0926\u0940", "\uD83C\uDDEE\uD83C\uDDF3"),
    LanguageOption("ta", "\u0BA4\u0BAE\u0BBF\u0BB4\u0BCD", "\uD83C\uDDEE\uD83C\uDDF3"),
    LanguageOption("bn", "\u09AC\u09BE\u0982\u09B2\u09BE", "\uD83C\uDDE7\uD83C\uDDE9"),
    LanguageOption("ja", "\u65E5\u672C\u8A9E", "\uD83C\uDDEF\uD83C\uDDF5"),
)

@Composable
fun OnboardingWelcomeStep(
    selectedLanguage: String,
    onLanguageSelected: (String) -> Unit,
    onNext: () -> Unit,
    onSkip: () -> Unit,
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

    Box(modifier = modifier.fillMaxSize()) {
        Image(
            painter = painterResource(R.drawable.onboarding_welcome),
            contentDescription = null,
            contentScale = ContentScale.Crop,
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
                            0.25f to Color.Transparent,
                            0.40f to Color.Black.copy(alpha = 0.4f),
                            0.55f to Color.Black.copy(alpha = 0.85f),
                            0.65f to Color.Black,
                        ),
                    ),
                ),
        )

        Column(
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .padding(horizontal = DesignTokens.Spacing.xl)
                .padding(bottom = DesignTokens.Spacing.xxl),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.base),
        ) {
            Text(
                text = stringResource(R.string.onboarding_welcome_title),
                fontSize = 32.sp,
                fontWeight = FontWeight.Bold,
                color = Color.White,
                textAlign = TextAlign.Center,
            )
            Text(
                text = stringResource(R.string.onboarding_welcome_subtitle),
                fontSize = 16.sp,
                color = Color.White.copy(alpha = 0.65f),
                textAlign = TextAlign.Center,
            )

            LazyVerticalGrid(
                columns = GridCells.Fixed(2),
                contentPadding = PaddingValues(vertical = DesignTokens.Spacing.sm),
                horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm),
                verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm),
                modifier = Modifier.height(280.dp),
            ) {
                items(LANGUAGES) { lang ->
                    LanguageButton(
                        language = lang,
                        isSelected = lang.displayName == selectedLanguage,
                        onClick = { onLanguageSelected(lang.displayName) },
                    )
                }
            }

            Row(
                horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.base),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                GlassButton(
                    text = stringResource(R.string.onboarding_continue),
                    onClick = onNext,
                    isPrimary = true,
                )
                TextButton(onClick = onSkip) {
                    Text(
                        text = stringResource(R.string.onboarding_skip),
                        color = DesignTokens.Colors.Text.muted,
                    )
                }
            }
        }
    }
}

@Composable
private fun LanguageButton(
    language: LanguageOption,
    isSelected: Boolean,
    onClick: () -> Unit,
) {
    val shape = RoundedCornerShape(DesignTokens.Radius.md)
    val bgColor = if (isSelected) DesignTokens.Colors.Primary.base else Color.White.copy(alpha = 0.10f)
    val borderColor = if (isSelected) DesignTokens.Colors.Primary.p500 else Color.White.copy(alpha = 0.12f)
    val borderWidth = if (isSelected) 2.dp else 1.dp

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(shape)
            .background(bgColor)
            .border(borderWidth, borderColor, shape)
            .clickable(onClick = onClick)
            .padding(horizontal = DesignTokens.Spacing.md, vertical = DesignTokens.Spacing.md),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.Center,
    ) {
        Text(text = language.flag, fontSize = 18.sp)
        Spacer(modifier = Modifier.width(DesignTokens.Spacing.sm))
        Text(
            text = language.displayName,
            color = Color.White,
            fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
            fontSize = 14.sp,
        )
    }
}
