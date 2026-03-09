package tv.bayit.plus.feature.onboarding.intro

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import tv.bayit.plus.designsystem.theme.DesignTokens
import tv.bayit.plus.feature.onboarding.R

@Composable
fun OnboardingIntroRoute(
    onComplete: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: OnboardingIntroViewModel = hiltViewModel(),
) {
    val currentStep by viewModel.currentStep.collectAsStateWithLifecycle()
    val selectedLanguage by viewModel.selectedLanguage.collectAsStateWithLifecycle()
    val userName by viewModel.userName.collectAsStateWithLifecycle()

    LaunchedEffect(Unit) {
        if (viewModel.isComplete) {
            onComplete()
        }
    }

    Box(
        modifier = modifier
            .fillMaxSize()
            .background(DesignTokens.Colors.Background.primary),
    ) {
        Column {
            if (currentStep != OnboardingIntroStep.COMPLETE) {
                TopBar(
                    currentStep = currentStep,
                    onSkip = {
                        viewModel.skip()
                        onComplete()
                    },
                )
            }

            AnimatedContent(
                targetState = currentStep,
                transitionSpec = {
                    slideInHorizontally { it } togetherWith slideOutHorizontally { -it }
                },
                label = "onboarding_step",
                modifier = Modifier.weight(1f),
            ) { step ->
                when (step) {
                    OnboardingIntroStep.WELCOME -> OnboardingWelcomeStep(
                        selectedLanguage = selectedLanguage,
                        onLanguageSelected = viewModel::setLanguage,
                        onNext = viewModel::nextStep,
                        onSkip = {
                            viewModel.skip()
                            onComplete()
                        },
                    )

                    OnboardingIntroStep.AI_LANGUAGE,
                    OnboardingIntroStep.PAUSE_ASK,
                    OnboardingIntroStep.INTERACTIVE,
                    OnboardingIntroStep.NEVER_MISS,
                    OnboardingIntroStep.ZEH_ANI,
                    -> {
                        val cardIndex = step.ordinal - 1
                        OnboardingFeatureCardStep(
                            card = FEATURE_CARDS[cardIndex],
                            languageName = selectedLanguage,
                            onContinue = viewModel::nextStep,
                        )
                    }

                    OnboardingIntroStep.VOICE_SETUP -> OnboardingVoiceStep(
                        userName = userName,
                        onUserNameChanged = viewModel::setUserName,
                        onNext = viewModel::nextStep,
                        onBack = viewModel::previousStep,
                    )

                    OnboardingIntroStep.COMPLETE -> OnboardingCompleteStep(
                        selectedLanguage = selectedLanguage,
                        userName = userName,
                        onStartWatching = {
                            viewModel.completeOnboarding()
                            onComplete()
                        },
                        onBack = viewModel::previousStep,
                    )
                }
            }
        }
    }
}

@Composable
private fun TopBar(
    currentStep: OnboardingIntroStep,
    onSkip: () -> Unit,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(
                horizontal = DesignTokens.Spacing.xl,
                vertical = DesignTokens.Spacing.md,
            ),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Row(
            modifier = Modifier.weight(1f),
            horizontalArrangement = Arrangement.spacedBy(DesignTokens.Spacing.xs),
        ) {
            val steps = OnboardingIntroStep.entries.filter { it != OnboardingIntroStep.COMPLETE }
            steps.forEach { step ->
                val filled = step.ordinal <= currentStep.ordinal
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .height(4.dp)
                        .clip(RoundedCornerShape(50))
                        .background(
                            if (filled) DesignTokens.Colors.Primary.base
                            else DesignTokens.Colors.Glass.bg,
                        ),
                )
            }
        }

        TextButton(onClick = onSkip) {
            Text(
                text = stringResource(R.string.onboarding_skip),
                color = DesignTokens.Colors.Text.muted,
            )
        }
    }
}
