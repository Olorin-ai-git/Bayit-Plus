package tv.bayit.plus.feature.onboarding.intro

import android.content.Context
import androidx.lifecycle.ViewModel
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import tv.bayit.plus.core.common.IsDebug
import javax.inject.Inject

@HiltViewModel
class OnboardingIntroViewModel @Inject constructor(
    @ApplicationContext private val context: Context,
    @IsDebug private val isDebug: Boolean,
) : ViewModel() {

    private val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    private val _currentStep = MutableStateFlow(OnboardingIntroStep.WELCOME)
    val currentStep: StateFlow<OnboardingIntroStep> = _currentStep.asStateFlow()

    private val _selectedLanguage = MutableStateFlow("English")
    val selectedLanguage: StateFlow<String> = _selectedLanguage.asStateFlow()

    private val _userName = MutableStateFlow("")
    val userName: StateFlow<String> = _userName.asStateFlow()

    val isComplete: Boolean
        get() = if (isDebug) false else prefs.getBoolean(KEY_COMPLETED, false)

    fun setLanguage(language: String) {
        _selectedLanguage.value = language
    }

    fun setUserName(name: String) {
        _userName.value = name
    }

    fun nextStep() {
        val steps = OnboardingIntroStep.entries
        val idx = steps.indexOf(_currentStep.value)
        if (idx < steps.lastIndex) {
            _currentStep.value = steps[idx + 1]
        }
    }

    fun previousStep() {
        val steps = OnboardingIntroStep.entries
        val idx = steps.indexOf(_currentStep.value)
        if (idx > 0) {
            _currentStep.value = steps[idx - 1]
        }
    }

    fun skip() {
        markComplete()
    }

    fun completeOnboarding() {
        markComplete()
    }

    private fun markComplete() {
        prefs.edit()
            .putBoolean(KEY_COMPLETED, true)
            .putString(KEY_LANGUAGE, _selectedLanguage.value)
            .putString(KEY_USER_NAME, _userName.value)
            .apply()
    }

    companion object {
        private const val PREFS_NAME = "bayit_onboarding_intro"
        private const val KEY_COMPLETED = "completed"
        private const val KEY_LANGUAGE = "language"
        private const val KEY_USER_NAME = "user_name"

        fun hasCompleted(context: Context): Boolean {
            return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                .getBoolean(KEY_COMPLETED, false)
        }

        fun resetForDebug(context: Context) {
            context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                .edit()
                .putBoolean(KEY_COMPLETED, false)
                .apply()
        }
    }
}
