package tv.bayit.plus.feature.onboarding.intro

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Language
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import tv.bayit.plus.designsystem.component.GlassButton
import tv.bayit.plus.designsystem.theme.DesignTokens
import tv.bayit.plus.feature.onboarding.R

@Composable
fun OnboardingCompleteStep(
    selectedLanguage: String,
    userName: String,
    onStartWatching: () -> Unit,
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

        Box(
            modifier = Modifier
                .size(120.dp)
                .clip(CircleShape)
                .background(DesignTokens.Colors.Semantic.success.copy(alpha = 0.15f)),
            contentAlignment = Alignment.Center,
        ) {
            Box(
                modifier = Modifier
                    .size(90.dp)
                    .clip(CircleShape)
                    .background(DesignTokens.Colors.Semantic.success.copy(alpha = 0.3f)),
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    imageVector = Icons.Default.Check,
                    contentDescription = null,
                    tint = Color.White,
                    modifier = Modifier.size(48.dp),
                )
            }
        }

        Text(
            text = stringResource(R.string.onboarding_complete_title),
            fontSize = 28.sp,
            fontWeight = FontWeight.Bold,
            color = DesignTokens.Colors.Text.primary,
            textAlign = TextAlign.Center,
            modifier = Modifier.padding(top = DesignTokens.Spacing.xxl),
        )

        Text(
            text = stringResource(R.string.onboarding_complete_subtitle),
            fontSize = 16.sp,
            color = DesignTokens.Colors.Text.secondary,
            textAlign = TextAlign.Center,
            modifier = Modifier.padding(
                top = DesignTokens.Spacing.md,
                bottom = DesignTokens.Spacing.xxl,
            ),
        )

        Row(
            horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.xxl),
        ) {
            SummaryCard(
                icon = Icons.Default.Language,
                value = selectedLanguage,
                label = stringResource(R.string.onboarding_complete_language),
            )
            if (userName.isNotBlank()) {
                SummaryCard(
                    icon = Icons.Default.Person,
                    value = userName,
                    label = stringResource(R.string.onboarding_complete_name),
                )
            }
        }

        Spacer(modifier = Modifier.weight(1f))

        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.base),
            modifier = Modifier.padding(bottom = DesignTokens.Spacing.xl),
        ) {
            GlassButton(
                text = stringResource(R.string.onboarding_complete_start_watching),
                onClick = onStartWatching,
                isPrimary = true,
                icon = Icons.Default.PlayArrow,
            )
            GlassButton(
                text = stringResource(R.string.onboarding_back),
                onClick = onBack,
                isPrimary = false,
            )
        }
    }
}

@Composable
private fun SummaryCard(
    icon: ImageVector,
    value: String,
    label: String,
) {
    val shape = RoundedCornerShape(DesignTokens.Radius.lg)
    Column(
        modifier = Modifier
            .clip(shape)
            .background(DesignTokens.Colors.Glass.bg)
            .border(1.dp, DesignTokens.Colors.Glass.border, shape)
            .padding(DesignTokens.Spacing.base),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.sm),
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = DesignTokens.Colors.Primary.p400,
            modifier = Modifier.size(28.dp),
        )
        Text(
            text = value,
            fontSize = 18.sp,
            fontWeight = FontWeight.Bold,
            color = DesignTokens.Colors.Text.primary,
        )
        Text(
            text = label,
            fontSize = 12.sp,
            color = DesignTokens.Colors.Text.muted,
        )
    }
}
