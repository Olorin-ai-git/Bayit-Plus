from fpdf import FPDF

pdf = FPDF()
pdf.add_page()
pdf.set_font("Arial", size=12)

pdf.set_title("OLORIN AI Agents and Tools Overview")
pdf.cell(0, 10, "AI Agents and Tools Overview", ln=True, align="C")
pdf.set_font("Arial", style="I", size=10)
pdf.cell(0, 8, "Created by Gil Klainert, May 2025", ln=True, align="C")
pdf.set_font("Arial", size=12)
pdf.ln(10)

# Insert architecture diagram image on its own page (full page)
pdf.add_page()
pdf.image("Architecture.png", x=10, y=20, w=pdf.w - 20)  # Centered, large

# Start the rest of the content on a new page
pdf.add_page()

# Introduction
pdf.multi_cell(
    0,
    10,
    """
This document provides a detailed overview of the AI Agents used in the system, their actions and responsibilities, the LLM prompts (static and dynamic parts) for each, and the tools (Splunk, Chronos, OII) they utilize. The focus is on the following agents: Logs, Network, Location, Device, and Risk.
""",
)
pdf.ln(5)


# Agent Details
def agent_section(name, responsibilities, static_prompt, dynamic_prompt, tools):
    pdf.set_font("Arial", style="B", size=12)
    pdf.cell(0, 10, f"Agent: {name}", ln=True)
    pdf.set_font("Arial", size=12)
    pdf.multi_cell(0, 8, f"Responsibilities: {responsibilities}")
    pdf.set_font("Arial", style="I", size=12)
    pdf.cell(0, 8, "LLM Prompt (Static Part):", ln=True)
    pdf.set_font("Arial", size=12)
    pdf.multi_cell(0, 8, static_prompt)
    pdf.set_font("Arial", style="I", size=12)
    pdf.cell(0, 8, "LLM Prompt (Dynamic Additions):", ln=True)
    pdf.set_font("Arial", size=12)
    pdf.multi_cell(0, 8, dynamic_prompt)
    pdf.set_font("Arial", style="I", size=12)
    pdf.cell(0, 8, "Tools Used:", ln=True)
    pdf.set_font("Arial", size=12)
    for tool in tools:
        pdf.cell(0, 8, f"- {tool}", ln=True)
    pdf.ln(5)


# Logs Agent
agent_section(
    "Logs",
    "Analyzes user authentication and login behavior for risk. Aggregates and correlates login events from both Splunk and Chronos. Assesses risk based on failed logins, location/device anomalies, and suspicious patterns.",
    "You are a fraud risk assessment expert specializing in authentication log analysis.\nGiven the following user id and parsed authentication log data, analyze the user's login behavior for risk.\nYour response MUST be a JSON object with the following structure: { 'risk_assessment': { ... } }\nEnsure all fields are populated.\nIf there are no authentication logs, set risk_level to 0.0, confidence to 0.0, and summary to 'No authentication logs found for this user.'\nNEVER return empty lists for required fields; use a placeholder string like 'No logins found' if needed.\nHigh risk: Multiple failed logins, logins from new or unusual locations/devices, rapid location/device changes, or other suspicious patterns.\nMedium risk: Occasional anomalies, but not enough to indicate clear fraud.\nLow risk: Consistent login patterns from known devices/locations, no anomalies.\nThe input data is as follows:",
    "- Splunk login/authentication events (sanitized)\n- Chronos login/authentication events (entities, metadata)\n- user_id, time_range (from API request)",
    ["Splunk", "Chronos"],
)

# Network Agent
agent_section(
    "Network",
    "Analyzes network access patterns, device IDs, IP addresses, ISPs, and geolocations to assess risk. Detects anomalies such as rapid country changes, inconsistent device usage, and suspicious access times.",
    "You are a security analyst specializing in network-based risk assessment.\nBased on the provided network signal data for a user, analyze all available information.\nThe data includes IP address, ISP, country, timestamps, and device ID.\nYour response MUST be a JSON object strictly conforming to the following Pydantic model schema: ...\nFocus your analysis on factors like: Geographic anomalies, consistency of device IDs and ISPs, time-based patterns.\nIMPORTANT: Base your risk score and risk factors PRIMARILY on geographic inconsistencies and device ID patterns.\nThe input data is as follows:",
    "- Extracted network signals from Splunk (device_id, ip_address, isp, country, timestamp)\n- user_id, time_range (from API request)",
    ["Splunk"],
)

# Location Agent
agent_section(
    "Location",
    "Assesses risk based on user location data from multiple sources. Correlates OII, Salesforce, Ekata, business, phone, and device locations. Looks for geographic inconsistencies and suspicious location changes.",
    "You are a fraud risk assessment expert specializing in location-based risk.\nBased on the provided location data for a user from various sources, analyze all available information.\nThe data includes OII, Salesforce, Ekata, Business, and Phone location info, plus a summary of device locations.\nYour response MUST be a JSON object with the following structure: { 'risk_assessment': { ... } }\nEnsure all fields are populated.\nThe input data is as follows:",
    "- OII location info (from OII tool)\n- Salesforce, Ekata, business, phone, and device locations (from Splunk and other sources)\n- user_id, time_range (from API request)",
    ["Splunk", "OII"],
)

# Device Agent
agent_section(
    "Device",
    "Analyzes device usage patterns, device IDs, geolocations, and challenges. Detects device switching, geographic conflicts, and unusual device activity. Now also retrieves session and device info from Chronos, and calls the DI Tool with sessionId and user_id for device intelligence scoring.",
    "You are a security analyst specializing in device-based risk assessment.\nBased on the provided device signal data for a user, analyze all available information.\nThe data includes IP address, geo-location (city, country, region), timestamps, and device ID.\nYour response MUST be a JSON object strictly conforming to the following Pydantic model schema: ...\nCRITICAL ANALYSIS REQUIREMENTS: Geographic analysis, device pattern analysis, risk scoring guidelines.\nThe input data is as follows:",
    "- Extracted device signals from Splunk (device_id, ip_address, city, country, region, timestamp, challenges)\n- user_id, time_range (from API request)\n- Chronos session and device info (sessionId, entities)\n- DI Tool response (device intelligence scoring)",
    ["Splunk", "Chronos", "DI Tool"],
)

# Risk Agent
agent_section(
    "Risk",
    "Aggregates the outputs of all other agents (Network, Location, Device, Logs, OII) to produce an overall risk score and summary. Responsible for combining risk factors and providing a holistic risk assessment.",
    "You are a risk aggregation expert. Given the outputs of the network, location, device, logs, and OII agents, produce an overall risk score and summary.\nYour response MUST be a JSON object with the following structure: { 'overallRiskScore': float, 'riskFactors': [str], ... }\nThe input data is as follows:",
    "- Outputs from Network, Location, Device, Logs, and OII agents (risk levels, risk factors, summaries)\n- user_id, timestamp",
    [],
)

pdf.output("AI_Agents_and_Tools_Overview.pdf")
print("PDF document 'AI_Agents_and_Tools_Overview.pdf' created.")
