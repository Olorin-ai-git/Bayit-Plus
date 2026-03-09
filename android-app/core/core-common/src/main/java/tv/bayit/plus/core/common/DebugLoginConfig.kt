package tv.bayit.plus.core.common

data class DebugLoginConfig(
    val email: String,
    val password: String,
) {
    val isEnabled: Boolean get() = email.isNotBlank() && password.isNotBlank()
}
