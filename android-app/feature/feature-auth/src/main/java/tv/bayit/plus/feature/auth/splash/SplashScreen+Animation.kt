package tv.bayit.plus.feature.auth.splash

import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import tv.bayit.plus.designsystem.theme.DesignTokens

@Composable
internal fun SplashLogoBlock(
    logoAlpha: Float,
    logoScale: Float,
    isHebrew: Boolean,
    wordOffset: Float,
    plusOffset: Float,
) {
    Column(
        modifier = Modifier
            .alpha(logoAlpha)
            .graphicsLayer(scaleX = logoScale, scaleY = logoScale),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md),
    ) {
        Image(
            painter = painterResource(id = tv.bayit.plus.feature.auth.R.drawable.splash_logo),
            contentDescription = "Bayit+ Logo",
            modifier = Modifier
                .width(120.dp)
                .height(60.dp),
            contentScale = ContentScale.Fit,
        )

        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.Center,
        ) {
            if (isHebrew) {
                Text(
                    text = "+",
                    color = DesignTokens.Colors.Primary.base,
                    fontSize = DesignTokens.FontSize.display,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.offset(x = plusOffset.dp),
                )
                Text(
                    text = "\u05D1\u05D9\u05EA",
                    color = Color.White,
                    fontSize = DesignTokens.FontSize.display,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.offset(x = wordOffset.dp),
                )
            } else {
                Text(
                    text = "Bayit",
                    color = Color.White,
                    fontSize = DesignTokens.FontSize.display,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.offset(x = wordOffset.dp),
                )
                Text(
                    text = "+",
                    color = DesignTokens.Colors.Primary.base,
                    fontSize = DesignTokens.FontSize.display,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.offset(x = plusOffset.dp),
                )
            }
        }
    }
}

@Composable
internal fun SplashSloganBlock(sloganAlpha: Float, slogan: String) {
    Box(
        modifier = Modifier
            .alpha(sloganAlpha)
            .padding(top = DesignTokens.Spacing.xl),
    ) {
        Text(
            text = slogan,
            style = MaterialTheme.typography.headlineSmall.copy(
                brush = Brush.horizontalGradient(
                    colors = listOf(
                        DesignTokens.Colors.Primary.light,
                        DesignTokens.Colors.Primary.base,
                    ),
                ),
            ),
            fontWeight = FontWeight.Medium,
            textAlign = TextAlign.Center,
        )
    }
}

@Composable
internal fun SplashPoweredByText(logoAlpha: Float) {
    Text(
        text = buildAnnotatedString {
            withStyle(style = SpanStyle(color = DesignTokens.Colors.Text.muted)) {
                append("Powered by Olorin")
            }
            withStyle(style = SpanStyle(color = Color(0xFF6B46C1))) {
                append(".ai")
            }
        },
        style = MaterialTheme.typography.bodySmall,
        modifier = Modifier
            .alpha(logoAlpha)
            .padding(bottom = DesignTokens.Spacing.lg),
    )
}

@Composable
internal fun Modifier.graphicsLayer(scaleX: Float = 1f, scaleY: Float = 1f): Modifier =
    this.scale(scaleX = scaleX, scaleY = scaleY)
