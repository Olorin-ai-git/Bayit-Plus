package tv.bayit.plus.feature.onboarding.intro

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material.icons.filled.Person
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import tv.bayit.plus.designsystem.component.GlassButton
import tv.bayit.plus.designsystem.theme.DesignTokens
import tv.bayit.plus.feature.onboarding.R

@Composable
fun OnboardingVoiceStep(
    userName: String,
    onUserNameChanged: (String) -> Unit,
    onNext: () -> Unit,
    onBack: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier
            .fillMaxSize()
            .background(DesignTokens.Colors.Background.primary)
            .padding(horizontal = DesignTokens.Spacing.xl),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Spacer(modifier = Modifier.weight(1f))

        Text(
            text = stringResource(R.string.onboarding_voice_title),
            fontSize = 28.sp,
            fontWeight = FontWeight.Bold,
            color = DesignTokens.Colors.Text.primary,
            textAlign = TextAlign.Center,
        )

        Text(
            text = stringResource(R.string.onboarding_voice_subtitle),
            fontSize = 16.sp,
            color = DesignTokens.Colors.Text.secondary,
            textAlign = TextAlign.Center,
            modifier = Modifier.padding(
                top = DesignTokens.Spacing.md,
                bottom = DesignTokens.Spacing.xxl,
            ),
        )

        Box(
            modifier = Modifier
                .size(100.dp)
                .clip(CircleShape)
                .background(DesignTokens.Colors.Primary.base.copy(alpha = 0.2f))
                .border(2.dp, DesignTokens.Colors.Primary.base, CircleShape),
            contentAlignment = Alignment.Center,
        ) {
            Icon(
                imageVector = Icons.Default.Mic,
                contentDescription = null,
                tint = DesignTokens.Colors.Primary.base,
                modifier = Modifier.size(40.dp),
            )
        }

        Text(
            text = stringResource(R.string.onboarding_voice_or_type),
            fontSize = 13.sp,
            color = DesignTokens.Colors.Text.muted,
            modifier = Modifier.padding(
                top = DesignTokens.Spacing.xxl,
                bottom = DesignTokens.Spacing.sm,
            ),
        )

        val shape = RoundedCornerShape(DesignTokens.Radius.md)
        Row(
            modifier = Modifier
                .fillMaxWidth(0.6f)
                .clip(shape)
                .background(DesignTokens.Colors.Glass.bg)
                .border(1.dp, DesignTokens.Colors.Glass.border, shape)
                .padding(DesignTokens.Spacing.base),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(
                imageVector = Icons.Default.Person,
                contentDescription = null,
                tint = DesignTokens.Colors.Text.muted,
            )
            Spacer(modifier = Modifier.width(DesignTokens.Spacing.sm))
            BasicTextField(
                value = userName,
                onValueChange = onUserNameChanged,
                textStyle = TextStyle(
                    color = DesignTokens.Colors.Text.primary,
                    fontSize = 16.sp,
                ),
                cursorBrush = SolidColor(DesignTokens.Colors.Primary.base),
                modifier = Modifier.fillMaxWidth(),
            )
        }

        Spacer(modifier = Modifier.weight(1f))

        Row(
            horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.base),
            modifier = Modifier.padding(bottom = DesignTokens.Spacing.xl),
        ) {
            GlassButton(
                text = stringResource(R.string.onboarding_back),
                onClick = onBack,
                isPrimary = false,
            )
            GlassButton(
                text = stringResource(R.string.tour_next),
                onClick = onNext,
                isPrimary = true,
                icon = Icons.AutoMirrored.Filled.ArrowForward,
            )
        }
    }
}
