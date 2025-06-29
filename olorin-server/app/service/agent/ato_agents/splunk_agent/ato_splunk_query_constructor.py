import urllib.parse

from app.service.config import get_settings_for_env

# Get environment-specific settings
settings = get_settings_for_env()
# Get the Splunk indices from settings
rss_index = settings.splunk_index

# --- Helper functions for building specific query types ---


def _build_auth_id_query(id_value: str) -> str:
    """Builds the base query for the 'auth_id' type (device/logs), full set of fields."""
    index_search = f"search index={rss_index}"
    query = f"""{index_search} intuit_userid={id_value}
| rex field=data "(account_email=(?<account_email>.+))"
| rex field=data "(account_login=(?<account_email>.+))"
| rex field=fuzzy_device_first_seen "(fuzzy_device_first_seen=(?<fuzzy_device_first_seen>.+))"
| rex field=local_attrib_3 "(local_attrib_3=(?<local_attrib_3>.+))"
| rex field=input_ip_isp "(input_ip_isp=(?<input_ip_isp>.+))"
| rex field=input_ip_region "(input_ip_region=(?<input_ip_region>.+))"
| rex field=true_ip_city "(true_ip_city=(?<true_ip_city>.+))"
| rex field=tm_sessionid "(tm_sessionid=(?<tm_sessionid>.+))"
| eval email_address=urldecode(account_email)
| eval fuzzy_device_first_seen=urldecode(fuzzy_device_first_seen)
| eval local_attrib_3=urldecode(local_attrib_3)
| eval input_ip_isp=urldecode(input_ip_isp)
| eval input_ip_region=urldecode(input_ip_region)
| eval true_ip_city=urldecode(true_ip_city)
| eval tm_sessionid=urldecode(tm_sessionid)
| stats values(email_address) values(intuit_username) values(intuit_offeringId) values(transaction) values(intuit_originatingip) values(input_ip_isp) values(true_ip_city) values(input_ip_region) values(fuzzy_device_id) values(fuzzy_device_first_seen) values(tm_sessionid) by intuit_userid"""
    return query


def _build_location_query(id_value: str) -> str:
    """Builds a query for the location agent, only selecting required columns."""
    index_search = f"search index={rss_index}"
    query = f"""{index_search} intuit_userid={id_value}
| rex field=contextualData "true_ip_city=(?<true_ip_city>[^&]+)"
| rex field=contextualData "true_ip_region=(?<true_ip_region>[^&]+)"
| rex field=contextualData "true_ip_geo=(?<true_ip_geo>[^&]+)"
| rex field=contextualData "true_ip=(?<true_ip>[^&]+)"
| rex field=contextualData "true_ip_isp=(?<true_ip_isp>[^&]+)"
| rex field=contextualData "true_ip_organization=(?<true_ip_organization>[^&]+)"
| rex field=contextualData "tm_sessionid=(?<tm_sessionid>[^&]+)"
| eval city=urldecode(true_ip_city)
| eval region=urldecode(true_ip_region)
| eval country=urldecode(true_ip_geo)
| eval ip=urldecode(true_ip)
| eval isp=urldecode(true_ip_isp)
| eval organization=urldecode(true_ip_organization)
| eval tm_sessionid=urldecode(tm_sessionid)
| table _time, city, region, country, ip, isp, organization, tm_sessionid
"""
    return query


def _build_network_query(id_value: str) -> str:
    """Builds a query for the network agent, only selecting required columns."""
    index_search = f"search index={rss_index}"
    query = f"""{index_search} intuit_userid={id_value}
| rex field=contextualData "true_ip=(?<true_ip>[^&]+)"
| rex field=contextualData "proxy_ip=(?<proxy_ip>[^&]+)"
| rex field=contextualData "input_ip_address=(?<input_ip_address>[^&]+)"
| rex field=contextualData "true_ip_isp=(?<true_ip_isp>[^&]+)"
| rex field=contextualData "true_ip_organization=(?<true_ip_organization>[^&]+)"
| rex field=contextualData "tm_sessionid=(?<tm_sessionid>[^&]+)"
| eval true_ip=urldecode(true_ip)
| eval proxy_ip=urldecode(proxy_ip)
| eval input_ip=urldecode(input_ip_address)
| eval isp=urldecode(true_ip_isp)
| eval organization=urldecode(true_ip_organization)
| eval tm_sessionid=urldecode(tm_sessionid)
| table _time, true_ip, proxy_ip, input_ip, isp, organization, tm_sessionid
"""
    return query


def _build_device_query(id_value: str) -> str:
    """Builds a query for the device agent, only selecting required columns."""
    index_search = f"search index={rss_index}"
    query = f"""{index_search} intuit_userid={id_value}
| rex field=contextualData "device_id=(?<device_id>[^&]+)"
| rex field=contextualData "fuzzy_device_id=(?<fuzzy_device_id>[^&]+)"
| rex field=contextualData "smartId=(?<smartId>[^&]+)"
| rex field=contextualData "tm_smartid=(?<tm_smartid>[^&]+)"
| rex field=contextualData "tm_sessionid=(?<tm_sessionid>[^&]+)"
| rex field=contextualData "intuit_tid=(?<intuit_tid>[^&]+)"
| rex field=contextualData "true_ip=(?<true_ip>[^&]+)"
| rex field=contextualData "true_ip_city=(?<true_ip_city>[^&]+)"
| rex field=contextualData "true_ip_geo=(?<true_ip_geo>[^&]+)"
| rex field=contextualData "true_ip_region=(?<true_ip_region>[^&]+)"
| rex field=contextualData "true_ip_latitude=(?<true_ip_latitude>[^&]+)"
| rex field=contextualData "true_ip_longitude=(?<true_ip_longitude>[^&]+)"
| eval device_id=urldecode(device_id)
| eval fuzzy_device_id=urldecode(fuzzy_device_id)
| eval smartId=urldecode(smartId)
| eval tm_smartid=urldecode(tm_smartid)
| eval tm_sessionid=urldecode(tm_sessionid)
| eval intuit_tid=urldecode(intuit_tid)
| eval true_ip=urldecode(true_ip)
| eval true_ip_city=urldecode(true_ip_city)
| eval true_ip_country=urldecode(true_ip_geo)
| eval true_ip_region=urldecode(true_ip_region)
| eval true_ip_latitude=urldecode(true_ip_latitude)
| eval true_ip_longitude=urldecode(true_ip_longitude)
| table _time, device_id, fuzzy_device_id, smartId, tm_smartid, tm_sessionid, intuit_tid, true_ip, true_ip_city, true_ip_country, true_ip_region, true_ip_latitude, true_ip_longitude"""
    return query


QUERY_BUILDERS = {
    "auth_id": _build_auth_id_query,
    "location": _build_location_query,
    "network": _build_network_query,
    "device": _build_device_query,
}


def build_base_search(id_value: str, id_type: str) -> str:
    builder_func = QUERY_BUILDERS.get(id_type)

    if builder_func:
        return builder_func(id_value)
    else:
        supported_types = ", ".join(QUERY_BUILDERS.keys())
        raise ValueError(
            f"Unsupported id_type: '{id_type}'. Supported types are: {supported_types}"
        )


def build_splunk_query_url(
    base_search: str, earliest_time: str = "-10d", exec_mode: str = "blocking"
) -> str:
    """Builds the URL-encoded query string from a base search."""
    encoded_search_string = urllib.parse.quote(base_search.replace("\n", " "), safe="")
    encoded_search_string = encoded_search_string.replace("%20%7C", "%0A%7C")
    # Don't add "search " prefix since queries already start with "index="
    final_query = encoded_search_string
    return final_query


def get_splunk_query(
    id_value: str,
    id_type: str,
    earliest_time: str = "-10d",
    exec_mode: str = "blocking",
) -> str:
    # Build the base search using the specific ID type and value
    base = build_base_search(id_value=id_value, id_type=id_type)
    # Construct the final URL
    return build_splunk_query_url(base, exec_mode=exec_mode)
