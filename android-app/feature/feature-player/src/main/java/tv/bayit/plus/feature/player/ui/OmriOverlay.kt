package tv.bayit.plus.feature.player.ui

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.delay
import tv.bayit.plus.designsystem.component.GlassCard
import tv.bayit.plus.designsystem.theme.DesignTokens
import tv.bayit.plus.feature.player.R

@Composable
fun OmriOverlay(onHide: () -> Unit) {
    var visible by remember { mutableStateOf(false) }
    var fadingOut by remember { mutableStateOf(false) }

    val alpha by animateFloatAsState(
        targetValue = when {
            fadingOut -> 0f
            visible -> 1f
            else -> 0f
        },
        animationSpec = tween(if (fadingOut) 1000 else 300),
        label = "omri_alpha",
    )

    LaunchedEffect(Unit) {
        visible = true
        delay(7_000)
        fadingOut = true
        delay(1_000)
        onHide()
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .alpha(alpha),
        contentAlignment = Alignment.Center,
    ) {
        GlassCard {
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.md),
            ) {
                Image(
                    painter = painterResource(id = R.drawable.omri_abba),
                    contentDescription = null,
                    modifier = Modifier
                        .width(160.dp)
                        .aspectRatio(0.75f)
                        .clip(RoundedCornerShape(DesignTokens.Radius.md)),
                    contentScale = ContentScale.Crop,
                )
                Text(
                    text = "אוהב אותך ומתגעגע",
                    color = DesignTokens.Colors.Text.primary,
                    fontSize = DesignTokens.FontSize.xxl,
                    fontWeight = FontWeight.Bold,
                    textAlign = TextAlign.Center,
                )
            }
        }
    }
}
