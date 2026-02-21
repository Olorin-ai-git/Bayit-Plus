package tv.bayit.plus.core.data.repository.impl

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.PUT
import retrofit2.http.POST
import retrofit2.http.Path
import tv.bayit.plus.core.common.BayitResult
import tv.bayit.plus.core.common.runCatchingResult
import tv.bayit.plus.core.data.repository.HouseholdRepository
import tv.bayit.plus.core.model.MessageResponse
import tv.bayit.plus.core.network.api.BayitApiClient

/**
 * Production implementation of [HouseholdRepository] backed by Retrofit.
 *
 * Delegates HTTP communication to [BayitApiClient], which handles auth headers,
 * correlation IDs, retry, rate limiting, and structured error mapping. Every
 * public method wraps the network call in [runCatchingResult] so callers receive
 * a [BayitResult] instead of raw exceptions.
 *
 * The household API manages family groups. GET /api/v1/household returns the
 * current user's household. Members, invitations, and role management use
 * sub-paths under the household ID.
 *
 * Endpoint paths mirror the iOS APIHouseholdRepository and web api.js.
 */
class ApiHouseholdRepository(
    private val client: BayitApiClient,
) : HouseholdRepository {

    private val service: HouseholdService = client.createService()

    override suspend fun getHousehold(): BayitResult<Any> = runCatchingResult {
        client.safeApiCall { service.getHousehold() }
    }

    override suspend fun getMembers(): BayitResult<List<Any>> = runCatchingResult {
        val household = client.safeApiCall { service.getHousehold() }
        household.members
    }

    override suspend fun inviteMember(email: String): BayitResult<Unit> =
        runCatchingResult {
            val household = client.safeApiCall { service.getHousehold() }
            val request = InviteMemberBody(email = email, role = "GUARDIAN")
            client.safeApiCall {
                service.inviteMember(household.householdId, request)
            }
            Unit
        }

    override suspend fun removeMember(memberId: String): BayitResult<Unit> =
        runCatchingResult {
            val household = client.safeApiCall { service.getHousehold() }
            client.safeApiCall {
                service.removeMember(household.householdId, memberId)
            }
            Unit
        }

    override suspend fun updateMemberRole(
        memberId: String,
        role: String,
    ): BayitResult<Unit> = runCatchingResult {
        val household = client.safeApiCall { service.getHousehold() }
        val request = RoleUpdateBody(role = role)
        client.safeApiCall {
            service.updateMemberRole(household.householdId, memberId, request)
        }
        Unit
    }

    override suspend fun getDevices(): BayitResult<List<Any>> = runCatchingResult {
        val household = client.safeApiCall { service.getHousehold() }
        val response = client.safeApiCall {
            service.getSharedControls(household.householdId)
        }
        response.devices ?: emptyList()
    }

    override suspend fun addProfile(
        name: String,
        avatarUrl: String?,
        ageGroup: String,
    ): BayitResult<Any> = runCatchingResult {
        val request = AddProfileBody(name = name, avatarUrl = avatarUrl, ageGroup = ageGroup)
        client.safeApiCall { service.addProfile(request) }
    }
}

// Service interface and models are in ApiHouseholdRepository+Models.kt
