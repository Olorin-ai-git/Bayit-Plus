# Mock Splunk data for demo mode
# This data is designed to trigger LLM-detectable anomalies for each agent

# Network agent mock data: includes an ISP in a different country
network_splunk_data = [
    {
        "fuzzy_device_id": "dev-001",
        "ip_address": "192.168.1.10",
        "isp": "Comcast",
        "true_ip_geo": "US",
        "_time": "2024-05-01T10:00:00Z",
    },
    {
        "fuzzy_device_id": "dev-002",
        "ip_address": "203.0.113.5",
        "isp": "Vodafone India",
        "true_ip_geo": "IN",
        "_time": "2024-05-01T10:05:00Z",
    },
    {
        "fuzzy_device_id": "dev-003",
        "ip_address": "192.168.1.11",
        "isp": "Comcast",
        "true_ip_geo": "US",
        "_time": "2024-05-01T10:10:00Z",
    },
]

# Device agent mock data: rapid location changes for the same device
device_splunk_data = [
    {
        "fuzzy_device_id": "dev-001",
        "ip_address": "192.168.1.10",
        "isp": "Comcast",
        "city": "San Francisco",
        "state": "CA",
        "true_ip_geo": "US",
        "CHALLENGE": "none",
        "_time": "2024-05-01T10:00:00Z",
    },
    {
        "fuzzy_device_id": "dev-001",
        "ip_address": "203.0.113.5",
        "isp": "Vodafone India",
        "city": "Mumbai",
        "state": "MH",
        "true_ip_geo": "IN",
        "CHALLENGE": "none",
        "_time": "2024-05-01T10:15:00Z",
    },
]

# Location agent mock data: conflicting locations
location_splunk_data = [
    {
        "fuzzy_device_id": "dev-001",
        "city": "San Francisco",
        "state": "CA",
        "country": "US",
        "_time": "2024-05-01T10:00:00Z",
    },
    {
        "fuzzy_device_id": "dev-002",
        "city": "Mumbai",
        "state": "MH",
        "country": "IN",
        "_time": "2024-05-01T10:05:00Z",
    },
]

# Logs agent mock data: failed logins and rapid device changes
logs_splunk_data = [
    {
        "email_address": "user@example.com",
        "intuit_username": "testuser",
        "intuit_offeringId": "QBO",
        "transaction": "login",
        "intuit_originatingip": "192.168.1.10",
        "input_ip_isp": "Comcast",
        "true_ip_city": "San Francisco",
        "input_ip_region": "CA",
        "fuzzy_device_id": "dev-001",
        "fuzzy_device_first_seen": "2024-04-01T09:00:00Z",
        "_time": "2024-05-01T10:00:00Z",
    },
    {
        "email_address": "user@example.com",
        "intuit_username": "testuser",
        "intuit_offeringId": "QBO",
        "transaction": "failed_login",
        "intuit_originatingip": "203.0.113.5",
        "input_ip_isp": "Vodafone India",
        "true_ip_city": "Mumbai",
        "input_ip_region": "MH",
        "fuzzy_device_id": "dev-002",
        "fuzzy_device_first_seen": "2024-04-01T09:05:00Z",
        "_time": "2024-05-01T10:05:00Z",
    },
]

# Mock addresses for additional location sources

business_location_mock = {
    "address1": "1 Business Center Dr",
    "address2": "Suite 100",
    "country": "USA",
    "locality": "Mountain View",
    "region": "CA",
    "postalCode": "94043",
    "phoneNumber": "+16502550123",
}
phone_location_mock = {
    "address1": "789 Phone St",
    "address2": "Apt 4B",
    "country": "USA",
    "locality": "Los Angeles",
    "region": "CA",
    "postalCode": "90001",
    "phoneNumber": "+13235550123",
}
