package tv.bayit.plus.data.model.zehani

import com.google.gson.annotations.SerializedName

data class WhatsAppContact(
    @SerializedName("id")
    val id: String,

    @SerializedName("profile_id")
    val profileId: String,

    @SerializedName("phone_number")
    val phoneNumber: String,

    @SerializedName("display_name")
    val displayName: String,

    @SerializedName("relationship")
    val relationship: String,

    @SerializedName("language")
    val language: String,

    @SerializedName("created_at")
    val createdAt: String
)

data class AddContactRequest(
    @SerializedName("profile_id")
    val profileId: String,

    @SerializedName("phone_number")
    val phoneNumber: String,

    @SerializedName("display_name")
    val displayName: String,

    @SerializedName("relationship")
    val relationship: String,

    @SerializedName("language")
    val language: String,

    @SerializedName("pin")
    val pin: String
)
