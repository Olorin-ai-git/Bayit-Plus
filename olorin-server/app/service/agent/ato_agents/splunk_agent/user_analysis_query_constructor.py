import urllib.parse

from app.service.config import get_settings_for_env

# Get environment-specific settings
settings = get_settings_for_env()
# Get the Splunk indices from settings
rss_index = settings.splunk_index
# Identity credential adapter index
identity_index = (
    "identity-credentialadapter-prd"
    if rss_index == "rss-prdidx"
    else "identity-credentialadapter-e2e"
)

# --- Helper functions for building user analysis query types ---


def _build_auth_device_query(user_id: str) -> str:
    """Builds the authentication and device history query for a user."""
    query = f"""index={rss_index} intuit_userid={user_id} 
| eval CHALLENGE=case(
    transactionDetail="challenge_type=idp","IDP",
    transactionDetail="challenge_type=otp_email","Email",
    transactionDetail="challenge_type=password","Password",
    transactionDetail="challenge_type=null","Null",
    transactionDetail="authenticator=password","Password",
    transactionDetail="challenge_type=otp_voice","Voice",
    transactionDetail="challenge_type=otp_sms","SMS",
    transactionDetail="challenge_type=totp","TOTP",
    transactionDetail="fi authentication passed","FI Authentication Passed",
    transactionDetail="fi","FI",
    transactionDetail="internal_risk_score=null*","",
    transactionDetail="challenge_type=oow_sms","SMS") 
| eval TRUE_ISP=urldecode(true_ip_isp)
| eval "INPUT_ISP"=urldecode(input_ip_isp) 
| eval "TRUE_IP_CITY"=urldecode(true_ip_city)
| eval "Device_First_Seen"=urldecode(fuzzy_device_first_seen)
| eval "TrueIP_State"=urldecode(true_ip_region)
| eval eventDate=strftime(_time,"%D")
| stats dc(intuit_tid) values(Device_First_Seen) values(eventDate) AS "Days Accessed" 
  dc(eventDate) AS "Number of Days Accessed" values(intuit_offeringId) values(transaction) 
  values(CHALLENGE) values(TRUE_IP_CITY) values(TrueIP_State) values(true_ip_geo) 
  values(INPUT_ISP) values(TRUE_ISP) by fuzzy_device_id 
| sort -"Number of Days Accessed"
"""
    return query


def _build_email_credentials_query(user_id: str) -> str:
    """Builds the email and credential updates query for a user."""
    query = f"""index={rss_index} fuzzy_device_id=* [| index={identity_index} api_result="*"
CredentialWriteCheck.authId="{user_id}"
| rename CredentialWriteCheck.authId AS "intuit_userid" 
| rename intuit_sessionid AS "sessionId" 
| fields sessionId, Authenticator_Add_Date] 
| rex field=data "(email=(?<account_email>.+))"
| rex field=data "(Username=(?<account_email>.+))"
| eval email_address=urldecode(Username)
| eval "Email_Updated_Date"=strftime(_time,"%D")
| search event=*
| table intuit_userid, intuit_realmid, _time, email_address, fuzzy_device_id, event, true_ip, true_ip_isp, true_ip_city, sessionId, intuit_tid
| dedup email_address
| sort +_time
"""
    return query


def _build_smart_id_query(user_id: str) -> str:
    """Builds the smart ID and proxy information query for a user."""
    query = f"""index={rss_index} [index={rss_index} intuit_userid={user_id} | fields smartId] 
| eval "TRUE_ISP"=urldecode(true_ip_isp) 
| eval "INPUT_ISP"=urldecode(input_ip_isp) 
| stats values(proxyType) values(dnsIpGeo) by smartId 
| sort -dc(intuit_userid)
"""
    return query


def get_direct_auth_query(user_id: str) -> str:
    """
    Create a direct auth query that doesn't require preprocessing.

    This function returns a query in the format that works directly with the Splunk SDK,
    without requiring additional preprocessing.

    Args:
        user_id: The user ID to query for

    Returns:
        A Splunk query string ready for direct execution
    """
    return f"""index="{rss_index}" intuit_userid={user_id} 
| eval CHALLENGE=case(
    transactionDetail="challenge_type=idp","IDP",
    transactionDetail="challenge_type=otp_email","Email",
    transactionDetail="challenge_type=password","Password",
    transactionDetail="challenge_type=null","Null",
    transactionDetail="authenticator=password","Password",
    transactionDetail="challenge_type=otp_voice","Voice",
    transactionDetail="challenge_type=otp_sms","SMS",
    transactionDetail="challenge_type=totp","TOTP",
    transactionDetail="fi authentication passed","FI Authentication Passed",
    transactionDetail="fi","FI",
    transactionDetail="internal_risk_score=null*","",
    transactionDetail="challenge_type=oow_sms","SMS") 
| eval TRUE_ISP=urldecode(true_ip_isp)
| eval "INPUT_ISP"=urldecode(input_ip_isp) 
| eval "TRUE_IP_CITY"=urldecode(true_ip_city)
| eval "Device_First_Seen"=urldecode(fuzzy_device_first_seen)
| eval "TrueIP_State"=urldecode(true_ip_region)
| eval eventDate=strftime(_time,"%D")
| stats dc(intuit_tid) values(Device_First_Seen) values(eventDate) AS "Days Accessed" 
  dc(eventDate) AS "Number of Days Accessed" values(intuit_offeringId) values(transaction) 
  values(CHALLENGE) values(TRUE_IP_CITY) values(TrueIP_State) values(true_ip_geo) 
  values(INPUT_ISP) values(TRUE_ISP) by fuzzy_device_id 
| sort -"Number of Days Accessed\""""


def get_direct_email_query(user_id: str) -> str:
    """
    Create a direct email query that doesn't require preprocessing.

    This function returns a query in the format that works directly with the Splunk SDK,
    without requiring additional preprocessing. It follows the exact format that works
    in the Splunk UI.

    Args:
        user_id: The user ID to query for

    Returns:
        A Splunk query string ready for direct execution
    """
    return f"""index="{rss_index}" fuzzy_device_id=* [index="{identity_index}" api_result="*" CredentialWriteCheck.authId="{user_id}"
| rename CredentialWriteCheck.authId AS "intuit_userid" 
| rename intuit_sessionid AS "sessionId" 
| fields sessionId, Authenticator_Add_Date] 
| rex field=data "(email=(?<account_email>.+))"
| rex field=data "(Username=(?<account_email>.+))"
| eval email_address=urldecode(Username)
| eval "Email_Updated_Date"=strftime(_time,"%D")
| search event=*
| table intuit_userid, intuit_realmid, _time, email_address, fuzzy_device_id, event, true_ip, true_ip_isp, true_ip_city, sessionId, intuit_tid
| dedup email_address
| sort +_time"""


def get_direct_smart_id_query(user_id: str) -> str:
    """
    Create a direct smart ID query that doesn't require preprocessing.

    This function returns a query in the format that works directly with the Splunk SDK,
    without requiring additional preprocessing.

    Args:
        user_id: The user ID to query for

    Returns:
        A Splunk query string ready for direct execution
    """
    return f"""index="{rss_index}" intuit_userid={user_id} 
| table _time intuit_userid smartId true_ip_isp input_ip_isp proxyType dnsIpGeo
| sort -_time"""


def get_improved_email_query(user_id: str) -> str:
    """
    Create an improved email query that directly accesses credential adapter data.

    This approach provides a more reliable method to extract email information
    by searching directly in the credential adapter index without complex joins.

    Args:
        user_id: The user ID to query for

    Returns:
        A Splunk query string optimized for email credential retrieval
    """
    return f"""index="{identity_index}" CredentialWriteCheck.authId="{user_id}" 
| eval userId=CredentialWriteCheck.authId
| rex field=_raw "(?i)email=(?<email_address>[^&\\s\"]+)"
| rex field=_raw "(?i)username=(?<username>[^&\\s\"]+)"
| eval email=coalesce(email_address, username)
| where isnotnull(email)
| table _time userId email api_result
| sort -_time"""


def get_simple_email_debug_query(user_id: str) -> str:
    """
    Create a simple debug query for email credentials that directly queries the credential adapter.

    This function returns a query that checks if any basic credential data exists for this user ID.

    Args:
        user_id: The user ID to query for

    Returns:
        A simple Splunk debug query for email credentials
    """
    return f"""index="{identity_index}" CredentialWriteCheck.authId="{user_id}" 
| table _time CredentialWriteCheck.authId api_result"""


def get_simple_smart_id_debug_query(user_id: str) -> str:
    """
    Create a simple debug query for smart ID that directly checks for smartId field.

    Args:
        user_id: The user ID to query for

    Returns:
        A simple Splunk debug query for smartId
    """
    return f"""index="{rss_index}" intuit_userid={user_id} smartId=*
| table _time intuit_userid smartId"""


# Dictionary mapping query types to builder functions
QUERY_BUILDERS = {
    "auth_device": _build_auth_device_query,
    "email_credentials": _build_email_credentials_query,
    "smart_id": _build_smart_id_query,
}

# Dictionary mapping query types to direct builder functions
DIRECT_QUERY_BUILDERS = {
    "auth_device": get_direct_auth_query,
    "email_credentials": get_direct_email_query,
    "smart_id": get_direct_smart_id_query,
}


def get_user_analysis_query(user_id: str, query_type: str) -> str:
    """
    Get a Splunk query for user analysis based on the specified query type.

    Args:
        user_id: The user ID to query for
        query_type: The type of query to build ("auth_device", "email_credentials", or "smart_id")

    Returns:
        The constructed Splunk query string

    Raises:
        ValueError: If an unsupported query_type is provided
    """
    builder_func = QUERY_BUILDERS.get(query_type)

    if builder_func:
        return builder_func(user_id)
    else:
        supported_types = ", ".join(QUERY_BUILDERS.keys())
        raise ValueError(
            f"Unsupported query_type: '{query_type}'. Supported types are: {supported_types}"
        )


def get_direct_user_analysis_query(user_id: str, query_type: str) -> str:
    """
    Get a direct Splunk query for user analysis based on the specified query type.

    These queries are optimized to work directly with the Splunk SDK without preprocessing.

    Args:
        user_id: The user ID to query for
        query_type: The type of query to build ("auth_device", "email_credentials", or "smart_id")

    Returns:
        The constructed direct Splunk query string

    Raises:
        ValueError: If an unsupported query_type is provided
    """
    builder_func = DIRECT_QUERY_BUILDERS.get(query_type)

    if builder_func:
        return builder_func(user_id)
    else:
        supported_types = ", ".join(DIRECT_QUERY_BUILDERS.keys())
        raise ValueError(
            f"Unsupported query_type: '{query_type}'. Supported types are: {supported_types}"
        )


def get_all_user_analysis_queries(user_id: str) -> dict:
    """
    Get all three user analysis queries for the specified user ID.

    Args:
        user_id: The user ID to query for

    Returns:
        Dictionary containing all three query types
    """
    return {
        "auth_device_query": get_user_analysis_query(user_id, "auth_device"),
        "email_credentials_query": get_user_analysis_query(
            user_id, "email_credentials"
        ),
        "smart_id_query": get_user_analysis_query(user_id, "smart_id"),
    }


def get_all_direct_user_analysis_queries(user_id: str) -> dict:
    """
    Get all three direct user analysis queries for the specified user ID.

    These queries are optimized to work directly with the Splunk SDK without preprocessing.

    Args:
        user_id: The user ID to query for

    Returns:
        Dictionary containing all three direct query types
    """
    return {
        "auth_device_query": get_direct_user_analysis_query(user_id, "auth_device"),
        "email_credentials_query": get_direct_user_analysis_query(
            user_id, "email_credentials"
        ),
        "smart_id_query": get_direct_user_analysis_query(user_id, "smart_id"),
    }
