package tv.bayit.plus.core.testing

import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import tv.bayit.plus.core.model.UserResponse

/**
 * Fake implementation of AuthRepository for testing.
 *
 * Simulates authentication flows with controllable test data.
 *
 * Usage:
 * ```
 * val fakeAuth = FakeAuthRepository()
 * fakeAuth.setCurrentUser(TestData.createUser())
 * fakeAuth.shouldFailLogin = true  // Simulate login failure
 * ```
 */
class FakeAuthRepository {

    private val _currentUser = MutableStateFlow<UserResponse?>(null)
    private val _isAuthenticated = MutableStateFlow(false)

    var shouldFailLogin = false
    var shouldFailRegister = false
    var shouldFailLogout = false
    var loginErrorMessage = "Invalid credentials"
    var registerErrorMessage = "Registration failed"

    /**
     * Get current authenticated user.
     */
    fun getCurrentUser(): Flow<UserResponse?> {
        return _currentUser
    }

    /**
     * Check if user is authenticated.
     */
    fun isAuthenticated(): Flow<Boolean> {
        return _isAuthenticated
    }

    /**
     * Login with email and password.
     * Returns Result with User on success or error on failure.
     */
    suspend fun login(email: String, password: String): Result<UserResponse> {
        return if (shouldFailLogin) {
            Result.failure(Exception(loginErrorMessage))
        } else {
            val user = TestData.createUser(email = email)
            _currentUser.value = user
            _isAuthenticated.value = true
            Result.success(user)
        }
    }

    /**
     * Register new user.
     */
    suspend fun register(
        email: String,
        password: String,
        displayName: String
    ): Result<UserResponse> {
        return if (shouldFailRegister) {
            Result.failure(Exception(registerErrorMessage))
        } else {
            val user = TestData.createUser(
                email = email,
                name = displayName
            )
            _currentUser.value = user
            _isAuthenticated.value = true
            Result.success(user)
        }
    }

    /**
     * Logout current user.
     */
    suspend fun logout(): Result<Unit> {
        return if (shouldFailLogout) {
            Result.failure(Exception("Logout failed"))
        } else {
            _currentUser.value = null
            _isAuthenticated.value = false
            Result.success(Unit)
        }
    }

    /**
     * Get authentication token.
     */
    suspend fun getToken(): String? {
        return if (_isAuthenticated.value) {
            "test-auth-token-${_currentUser.value?.id}"
        } else {
            null
        }
    }

    /**
     * Send password reset email.
     */
    suspend fun sendPasswordReset(email: String): Result<Unit> {
        return Result.success(Unit)
    }

    // Test utility methods

    fun setCurrentUser(user: UserResponse?) {
        _currentUser.value = user
        _isAuthenticated.value = user != null
    }

    fun setAuthenticated(authenticated: Boolean) {
        _isAuthenticated.value = authenticated
        if (!authenticated) {
            _currentUser.value = null
        }
    }

    fun clear() {
        _currentUser.value = null
        _isAuthenticated.value = false
        shouldFailLogin = false
        shouldFailRegister = false
        shouldFailLogout = false
    }
}
