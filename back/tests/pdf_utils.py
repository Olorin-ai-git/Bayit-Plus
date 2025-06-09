import os
from datetime import datetime

from fpdf import FPDF


def generate_improved_pdf():
    """Generate an improved PDF with mock investigation data."""
    # Mock investigation data
    investigation_id = "INV-DEMO-001"
    user_id = "demo_user_123"
    time_range = "1h"
    # Mock data from API responses
    summary_data = {
        "investigation_info": {
            "Investigation ID": investigation_id,
            "User ID": user_id,
            "Time Range": time_range,
            "Overall Risk Score": 0.75,
            "Status": "COMPLETED",
            "Timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        },
        "modules": [
            {
                "name": "Device Analysis",
                "risk_score": 0.8,
                "record_count": 23,
                "llm_thoughts": "The user has multiple devices from India and the US very close in time. The geographic distance between these locations makes such rapid switching suspicious. Additionally, three distinct device IDs accessed the account from different countries (US and IN), increasing the likelihood that this is abnormal user behavior and elevates the risk.",
                "risk_details": {
                    "risk_factors": [
                        "Multiple devices observed from IN and US",
                        "Rapid switching between India and US locations",
                        "Short time interval between logins in geographically distant regions",
                    ]
                },
            },
            {
                "name": "Location Analysis",
                "risk_score": 0.8,
                "record_count": 23,
                "llm_thoughts": "Two distinct devices (e9e49d25 and f394742f3) appear in different countries (US and IN) within approximately 37 minutes, indicating potential impossible travel. Vector search distances (8.0) indicate moderately similar patterns, thus not conclusively normal or highly anomalous. However, the location discrepancy against the official address (USA) strongly suggests heightened risk. Security measures such as multi-factor authentication, transaction monitoring, and potential IP verification are recommended.",
                "risk_details": {
                    "risk_factors": [
                        "Access from India (IN) and the official address country is USA",
                        "Multiple devices used in short succession from different countries (US and IN)",
                        "Possible 'impossible travel' scenario: less than an hour between US and IN accesses",
                    ]
                },
            },
            {
                "name": "Network Analysis",
                "risk_score": 0.8,
                "record_count": 23,
                "llm_thoughts": "The user accessed from an Indian ISP and then shortly thereafter from an ISP located in the US, suggesting a potential VPN/proxy usage or account compromise. This abrupt time-based geographic shift indicates high risk. The multiple session IDs aligned with different ISPs add to the suspicious nature of these signals. Overall, the behavior suggests unusual or possibly malicious network patterns.",
                "risk_details": {
                    "risk_factors": [
                        "Impossible travel time from India to US",
                        "Multiple ISPs from different countries within minutes",
                    ]
                },
            },
            {
                "name": "Logs Analysis",
                "risk_score": 0.7,
                "record_count": 18,
                "llm_thoughts": "Analysis of authentication logs reveals multiple login attempts from different geographic locations within a short timeframe. The logs show successful authentications from both India and the US within 30 minutes, which is physically impossible. Additionally, the logs contain evidence of multiple device fingerprints and varying user agent strings, suggesting potential account takeover or credential sharing.",
                "risk_details": {
                    "risk_factors": [
                        "Multiple successful logins from geographically distant locations",
                        "Varying device fingerprints in authentication logs",
                        "Suspicious user agent string patterns",
                    ]
                },
            },
        ],
        "overall_assessment": {
            "risk_score": 0.8,
            "llm_thoughts": "Based on comprehensive analysis across device, location, and network modules, this user exhibits high-risk behavior patterns. The consistent theme of rapid geographic transitions between India and the US across all analysis modules strongly suggests either account compromise or sophisticated evasion techniques. Immediate security measures are recommended including account verification, transaction monitoring, and potential account suspension pending further investigation.",
            "policy_comments": "RECOMMENDATION: Implement immediate enhanced monitoring for this account. Consider requiring additional authentication factors for high-value transactions. Review account activity for unauthorized changes or suspicious transactions.",
        },
    }
    # Check for font file
    if not os.path.exists("DejaVuSans.ttf"):
        print("WARNING: DejaVuSans.ttf font file is missing. Using default font.")
        use_custom_font = False
    else:
        use_custom_font = True
    # Create PDF
    pdf = FPDF()
    pdf.add_page()
    if use_custom_font:
        pdf.add_font("DejaVu", "", "DejaVuSans.ttf", uni=True)
        pdf.add_font("DejaVu", "B", "DejaVuSans.ttf", uni=True)
        font_family = "DejaVu"
    else:
        font_family = "Arial"
    # --- TITLE AND HEADER ---
    pdf.set_font(font_family, "B", 16)
    pdf.cell(0, 15, "Investigation Risk Assessment Report", ln=1, align="C")
    pdf.ln(5)
    # --- INVESTIGATION SUMMARY TABLE ---
    pdf.set_font(font_family, "B", 12)
    pdf.cell(0, 10, "Investigation Summary", ln=1)
    pdf.ln(2)
    pdf.set_font(font_family, "", 10)
    info = summary_data["investigation_info"]
    # Create a clean summary table
    summary_items = [
        ("Investigation ID", info["Investigation ID"]),
        ("User ID", info["User ID"]),
        ("Time Range", info["Time Range"]),
        (
            "Overall Risk Score",
            (
                f"{info['Overall Risk Score']:.2f}"
                if info["Overall Risk Score"]
                else "0.00"
            ),
        ),
        ("Status", info["Status"]),
        ("Generated", info["Timestamp"]),
    ]
    for label, value in summary_items:
        pdf.set_font(font_family, "B", 10)
        pdf.cell(50, 8, f"{label}:", border=1, align="L")
        pdf.set_font(font_family, "", 10)
        pdf.cell(0, 8, str(value), border=1, ln=1, align="L")
    pdf.ln(10)
    # --- MODULE ANALYSIS TABLE ---
    pdf.set_font(font_family, "B", 12)
    pdf.cell(0, 10, "Module Analysis Summary", ln=1)
    pdf.ln(2)
    # Table headers
    headers = ["Module", "Risk Score", "Records", "Status"]
    col_widths = [50, 25, 25, 90]
    pdf.set_font(font_family, "B", 10)
    for i, header in enumerate(headers):
        pdf.cell(col_widths[i], 10, header, border=1, align="C")
    pdf.ln()
    # Table rows
    pdf.set_font(font_family, "", 10)
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
    pdf.set_font(font_family, "B", 12)
    pdf.cell(0, 10, "Detailed Module Analysis", ln=1)
    pdf.ln(5)
    for module in summary_data["modules"]:
        # Module header with risk score
        pdf.set_font(font_family, "B", 11)
        risk_score = module["risk_score"]
        pdf.cell(0, 8, f"{module['name']} (Risk Score: {risk_score:.2f})", ln=1)
        # Risk level indicator
        pdf.set_font(font_family, "", 10)
        risk_level = (
            "High" if risk_score >= 0.7 else "Medium" if risk_score >= 0.4 else "Low"
        )
        pdf.cell(0, 8, f"Risk Level: {risk_level}", ln=1)
        pdf.ln(5)
        # Risk factors
        pdf.set_font(font_family, "", 10)
        for factor in module["risk_details"]["risk_factors"]:
            pdf.cell(0, 8, f"- {factor}", ln=1)
        pdf.ln(5)
        # LLM Thoughts
        pdf.set_font(font_family, "", 10)
        pdf.cell(0, 8, f"LLM Thoughts: {module['llm_thoughts']}", ln=1)
        pdf.ln(5)
        # Risk details
        pdf.set_font(font_family, "", 10)
        pdf.cell(0, 8, f"Risk Details: {module['risk_details']}", ln=1)
        pdf.ln(5)
        pdf.cell(0, 8, "", ln=1)
        pdf.ln(5)
    pdf.ln(10)
    # --- OVERALL ASSESSMENT ---
    pdf.set_font(font_family, "B", 12)
    pdf.cell(0, 10, "Overall Assessment", ln=1)
    pdf.ln(5)
    pdf.set_font(font_family, "", 10)
    pdf.cell(
        0,
        8,
        f"Risk Score: {summary_data['overall_assessment']['risk_score']:.2f}",
        ln=1,
    )
    pdf.ln(5)
    pdf.cell(
        0,
        8,
        f"LLM Thoughts: {summary_data['overall_assessment']['llm_thoughts']}",
        ln=1,
    )
    pdf.ln(5)
    pdf.cell(
        0,
        8,
        f"Policy Comments: {summary_data['overall_assessment']['policy_comments']}",
        ln=1,
    )
    pdf.ln(5)
    pdf.cell(0, 8, "", ln=1)
    pdf.ln(5)
    # --- FOOTER ---
    pdf.set_font(font_family, "", 10)
    pdf.cell(0, 8, "Thank you for your attention.", ln=1)
    pdf.cell(0, 8, "Please contact your security team for further assistance.", ln=1)
    pdf.cell(0, 8, "", ln=1)
    pdf.cell(0, 8, "Investigation Risk Assessment Report", ln=1, align="C")
    pdf.cell(0, 8, datetime.now().strftime("%Y-%m-%d %H:%M:%S"), ln=1, align="C")
    pdf.output("investigation_risk_assessment_report.pdf")
