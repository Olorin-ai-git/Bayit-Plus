import os
import time
from datetime import datetime

import requests
from fpdf import FPDF

BASE_URL = "http://localhost:8000/api"  # Change if your API runs elsewhere

investigation_id = "INV-All-TESTS"
entity_id = "4621097846089147992"
entity_type = "user_id"
time_range = "120d"

headers = {
    "Authorization": "Olorin_APIKey intuit_apikey=preprdakyres3AVWXWEiZESQdOnynrcYt9h9wwfR,intuit_apikey_version=1.0",
    "Content-Type": "application/json",
    "X-Forwarded-Port": "8090",
    "intuit_experience_id": "d3d28eaa-7ca9-4aa2-8905-69ac11fd8c58",
    "intuit_originating_assetalias": "Olorin.cas.hri.olorin",
}


def print_response(resp):
    print(f"Status: {resp.status_code}")
    try:
        print(resp.json())
    except Exception:
        print(resp.text)


# -1. Delete existing investigation after helper definition
print(f"\nDeleting existing investigation {investigation_id} if it exists...")
try:
    del_resp = requests.delete(
        f"{BASE_URL}/investigation/{investigation_id}", headers=headers
    )
    print_response(del_resp)
    assert del_resp.status_code in (
        200,
        204,
        404,
    ), f"Unexpected status {del_resp.status_code} when deleting investigation"
except Exception as e:
    print(f"Error during deletion of investigation: {e}")

# 0. Create new investigation
print(f"\nCreating new investigation {investigation_id}...")
create_payload = {
    "id": investigation_id,
    "entity_id": entity_id,
    "entity_type": entity_type,
}
create_resp = requests.post(
    f"{BASE_URL}/investigation", json=create_payload, headers=headers
)
print_response(create_resp)
assert create_resp.status_code in (
    200,
    201,
), f"Expected 200 or 201, got {create_resp.status_code}"

# 0. Test POST comment before investigation exists
print(
    "\nTesting POST /investigation/{investigation_id}/comment before investigation exists..."
)
comment_payload = {
    "entity_id": entity_id,
    "entity_type": "user_id",
    "sender": "Investigator",
    "text": "Initial comment message for investigation creation test.",
    "timestamp": int(time.time() * 1000),
}
resp = requests.post(
    f"{BASE_URL}/investigation/{investigation_id}/comment",
    json=comment_payload,
    headers=headers,
)
print_response(resp)
assert resp.status_code == 201, f"Expected 201, got {resp.status_code}"
comment_msg = resp.json()
assert comment_msg["text"] == comment_payload["text"]

# Confirm comment is retrievable
print("\nTesting GET /investigation/{investigation_id}/comment...")
resp = requests.get(
    f"{BASE_URL}/investigation/{investigation_id}/comment",
    headers=headers,
)
print_response(resp)
assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
comment_msgs = resp.json()
assert any(msg["text"] == comment_payload["text"] for msg in comment_msgs)

# 2. Call all domain APIs and update investigation with risk scores
domain_endpoints = [
    ("device", f"{BASE_URL}/device/{entity_id}"),
    ("location", f"{BASE_URL}/location/{entity_id}"),
    ("network", f"{BASE_URL}/network/{entity_id}"),
    ("logs", f"{BASE_URL}/logs/{entity_id}"),
]

domain_scores = {}
# Store responses for PDF summary
device_data = None
location_data = None
network_data = None
logs_data = None

for domain, url in domain_endpoints:
    print(f"\nCalling {domain} API...")
    params = {
        "time_range": time_range,
        "investigation_id": investigation_id,
        "entity_type": entity_type,
        "entity_id": entity_id,
    }
    resp = requests.get(url, params=params, headers=headers)
    print_response(resp)

    # Extract risk score (handle None and missing keys)
    if domain == "device":
        risk = resp.json().get("llm_assessment")
        device_data = resp.json()
    elif domain == "location":
        risk = resp.json().get("location_risk_assessment")
        location_data = resp.json()
    elif domain == "network":
        risk = resp.json().get("network_risk_assessment")
        network_data = resp.json()
    elif domain == "logs":
        risk = resp.json().get("risk_assessment")
        logs_data = resp.json()
    else:
        risk = None

    score = risk.get("risk_level") if isinstance(risk, dict) else None
    domain_scores[domain] = score

# --- PDF SUMMARY GENERATION ---
# Extract data from API responses for better organization
final_investigation = {}

# Prepare enhanced summary data with proper risk scores
summary_data = {
    "investigation_info": {
        "Investigation ID": investigation_id,
        "Entity ID": entity_id,
        "Entity Type": entity_type,
        "Time Range": time_range,
        "Overall Risk Score": 0,
        "Status": "Unknown",
        "Timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
    },
    "modules": [
        {
            "name": "Device Analysis",
            "risk_score": (
                device_data.get("llm_assessment", {}).get("risk_level", 0)
                if device_data
                else 0
            ),
            "record_count": (
                len(device_data.get("retrieved_signals", [])) if device_data else 0
            ),
            "llm_thoughts": (
                device_data.get("llm_assessment", {}).get("thoughts", "")
                if device_data
                else ""
            ),
            "risk_details": (
                device_data.get("llm_assessment", {}) if device_data else {}
            ),
        },
        {
            "name": "Location Analysis",
            "risk_score": (
                location_data.get("location_risk_assessment", {}).get("risk_level", 0)
                if location_data
                else 0
            ),
            "record_count": (
                len(location_data.get("device_locations", [])) if location_data else 0
            ),
            "llm_thoughts": (
                location_data.get("location_risk_assessment", {}).get("summary", "")
                if location_data
                else ""
            ),
            "risk_details": (
                location_data.get("location_risk_assessment", {})
                if location_data
                else {}
            ),
        },
        {
            "name": "Network Analysis",
            "risk_score": (
                network_data.get("network_risk_assessment", {}).get("risk_level", 0)
                if network_data
                else 0
            ),
            "record_count": (
                network_data.get("raw_splunk_results_count", 0) if network_data else 0
            ),
            "llm_thoughts": (
                network_data.get("network_risk_assessment", {}).get("thoughts", "")
                if network_data
                else ""
            ),
            "risk_details": (
                network_data.get("network_risk_assessment", {}) if network_data else {}
            ),
        },
        {
            "name": "Logs Analysis",
            "risk_score": (
                logs_data.get("risk_assessment", {}).get("risk_level", 0)
                if logs_data
                else 0
            ),
            "record_count": len(logs_data.get("splunk_data", [])) if logs_data else 0,
            "llm_thoughts": (
                logs_data.get("risk_assessment", {}).get("summary", "")
                if logs_data
                else ""
            ),
            "risk_details": logs_data.get("risk_assessment", {}) if logs_data else {},
        },
    ],
    "overall_assessment": {
        "risk_score": 0,
        "llm_thoughts": "",
        "policy_comments": "",
    },
}

# --- After collecting all domain data ---
# Call overall risk assessment endpoint
print("\nCalling overall risk assessment API...")
overall_url = f"{BASE_URL}/risk-assessment/{entity_id}"
overall_params = {"investigation_id": investigation_id, "entity_type": entity_type}
overall_resp = requests.get(overall_url, params=overall_params, headers=headers)
print(f"Overall risk assessment status: {overall_resp.status_code}")
if overall_resp.status_code == 200:
    overall_data = overall_resp.json()
    summary_data["overall_assessment"] = {
        "risk_score": overall_data.get("overallRiskScore", 0),
        "llm_thoughts": overall_data.get("accumulatedLLMThoughts", ""),
        "policy_comments": "",
    }
    print("Overall risk assessment:")
    print(overall_data)
else:
    print(f"Failed to get overall risk assessment: {overall_resp.text}")
    # Use fallback values
    max_domain_risk = max(
        [score for score in domain_scores.values() if score is not None] or [0.0]
    )
    summary_data["overall_assessment"] = {
        "risk_score": max_domain_risk,
        "llm_thoughts": f"Overall risk assessment service unavailable. Using highest domain risk score: {max_domain_risk}",
        "policy_comments": "",
    }

# --- PDF SUMMARY GENERATION ---
# Use existing DejaVuSans.ttf, do not delete or download
if not os.path.exists("DejaVuSans.ttf"):
    print(
        "WARNING: DejaVuSans.ttf font file is missing. Skipping PDF summary generation."
    )
else:
    pdf = FPDF()
    pdf.add_page()
    pdf.add_font("DejaVu", "", "DejaVuSans.ttf", uni=True)
    pdf.add_font("DejaVu", "B", "DejaVuSans.ttf", uni=True)

    # --- AUTHOR AND DATE ---
    pdf.set_font("DejaVu", "", 10)
    pdf.cell(0, 8, f"Created by: Gil Klainert FP NYC", ln=1, align="L")
    pdf.cell(0, 8, f"Date: {datetime.now().strftime('%Y-%m-%d')}", ln=1, align="L")
    pdf.ln(2)

    # --- TITLE AND HEADER ---
    pdf.set_font("DejaVu", "B", 16)
    pdf.cell(0, 15, "Investigation Risk Assessment Report", ln=1, align="C")
    pdf.ln(5)

    # --- INVESTIGATION SUMMARY TABLE ---
    pdf.set_font("DejaVu", "B", 12)
    pdf.cell(0, 10, "Investigation Summary", ln=1)
    pdf.ln(2)

    pdf.set_font("DejaVu", "", 10)
    info = summary_data["investigation_info"]

    # Create a clean summary table
    summary_items = [
        ("Investigation ID", info["Investigation ID"]),
        ("Entity ID", info["Entity ID"]),
        ("Entity Type", info["Entity Type"]),
        ("Time Range", info["Time Range"]),
        (
            "Overall Risk Score",
            (
                f"{summary_data['overall_assessment']['risk_score']:.2f}"
                if summary_data["overall_assessment"]["risk_score"]
                else "0.00"
            ),
        ),
        ("Status", info["Status"]),
        ("Generated", info["Timestamp"]),
    ]

    for label, value in summary_items:
        pdf.set_font("DejaVu", "B", 10)
        pdf.cell(50, 8, f"{label}:", border=1, align="L")
        pdf.set_font("DejaVu", "", 10)
        pdf.cell(0, 8, str(value), border=1, ln=1, align="L")

    pdf.ln(10)

    # --- MODULE ANALYSIS TABLE ---
    pdf.set_font("DejaVu", "B", 12)
    pdf.cell(0, 10, "Module Analysis Summary", ln=1)
    pdf.ln(2)

    # Table headers
    table_headers = ["Module", "Risk Score", "Records", "Status"]
    col_widths = [50, 25, 25, 90]

    pdf.set_font("DejaVu", "B", 10)
    for i, header in enumerate(table_headers):
        pdf.cell(col_widths[i], 10, header, border=1, align="C")
    pdf.ln()

    # Table rows
    pdf.set_font("DejaVu", "", 10)
    for module in summary_data["modules"]:
        risk_score = module["risk_score"]
        risk_color = (
            "High" if risk_score >= 0.7 else "Medium" if risk_score >= 0.4 else "Low"
        )
        status = f"{risk_color} Risk"

        pdf.cell(col_widths[0], 10, module["name"], border=1, align="L")
        pdf.cell(
            col_widths[1],
            10,
            f"{risk_score:.2f}" if risk_score else "0.00",
            border=1,
            align="C",
        )
        pdf.cell(col_widths[2], 10, str(module["record_count"]), border=1, align="C")
        pdf.cell(col_widths[3], 10, status, border=1, align="L")
        pdf.ln()

    pdf.ln(10)

    # --- DETAILED MODULE ANALYSIS ---
    pdf.set_font("DejaVu", "B", 12)
    pdf.cell(0, 10, "Detailed Module Analysis", ln=1)
    pdf.ln(5)

    for module in summary_data["modules"]:
        # Module header with risk score
        pdf.set_font("DejaVu", "B", 11)
        risk_score = module["risk_score"]
        pdf.cell(0, 8, f"{module['name']} (Risk Score: {risk_score:.2f})", ln=1)

        # Risk level indicator
        pdf.set_font("DejaVu", "", 10)
        risk_level = (
            "HIGH RISK"
            if risk_score >= 0.7
            else "MEDIUM RISK" if risk_score >= 0.4 else "LOW RISK"
        )
        pdf.cell(0, 6, f"Risk Level: {risk_level}", ln=1)
        pdf.cell(0, 6, f"Records Analyzed: {module['record_count']}", ln=1)
        pdf.ln(2)

        # LLM Thoughts
        pdf.set_font("DejaVu", "B", 10)
        pdf.cell(0, 6, "Analysis:", ln=1)
        pdf.set_font("DejaVu", "", 9)

        thoughts = module["llm_thoughts"]
        if not thoughts or thoughts.strip() == "":
            thoughts = "No detailed analysis available for this module."

        # Wrap long text properly
        pdf.multi_cell(0, 5, thoughts, border=0)

        # Risk factors if available
        risk_details = module["risk_details"]
        if risk_details and isinstance(risk_details, dict):
            risk_factors = risk_details.get("risk_factors", [])
            if risk_factors:
                pdf.ln(2)
                pdf.set_font("DejaVu", "B", 10)
                pdf.cell(0, 6, "Key Risk Factors:", ln=1)
                pdf.set_font("DejaVu", "", 9)
                for factor in risk_factors[:3]:  # Limit to top 3 factors
                    pdf.cell(0, 5, f"• {factor}", ln=1)

        pdf.ln(8)

    # --- OVERALL ASSESSMENT ---
    pdf.set_font("DejaVu", "B", 12)
    pdf.cell(0, 10, "Overall Risk Assessment", ln=1)
    pdf.ln(2)

    overall = summary_data["overall_assessment"]
    overall_risk = overall["risk_score"] or 0

    # Risk score with color coding
    pdf.set_font("DejaVu", "B", 11)
    overall_level = (
        "HIGH RISK"
        if overall_risk >= 0.7
        else "MEDIUM RISK" if overall_risk >= 0.4 else "LOW RISK"
    )
    pdf.cell(0, 8, f"Final Risk Score: {overall_risk:.2f} ({overall_level})", ln=1)
    pdf.ln(3)

    # Final thoughts
    pdf.set_font("DejaVu", "B", 10)
    pdf.cell(0, 6, "Final Assessment:", ln=1)
    pdf.set_font("DejaVu", "", 9)

    final_thoughts = overall["llm_thoughts"] or "No overall assessment available."
    pdf.multi_cell(0, 5, final_thoughts, border=0)

    # Policy comments if available
    policy_comments = overall["policy_comments"]
    if policy_comments and policy_comments.strip():
        pdf.ln(5)
        pdf.set_font("DejaVu", "B", 10)
        pdf.cell(0, 6, "Policy Recommendations:", ln=1)
        pdf.set_font("DejaVu", "", 9)
        pdf.multi_cell(0, 5, policy_comments, border=0)

    # --- FOOTER ---
    pdf.ln(10)
    pdf.set_font("DejaVu", "", 8)
    pdf.cell(
        0,
        5,
        f"Report generated on {datetime.now().strftime('%Y-%m-%d at %H:%M:%S')}",
        ln=1,
        align="C",
    )
    pdf.cell(
        0,
        5,
        "This report contains sensitive security information - handle with care",
        ln=1,
        align="C",
    )

    pdf.output("investigation_summary_for_user.pdf")
    print("PDF summary saved as investigation_summary_for_user.pdf")

print("\nTest script completed.")
