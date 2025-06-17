import argparse
import asyncio
import json
import os
import time
from datetime import datetime
from queue import Queue
from threading import Thread

import requests
import websockets
from fpdf import FPDF

parser = argparse.ArgumentParser(
    description="Run autonomous investigation flow for a given device and monitor via WebSocket."
)
parser.add_argument(
    "--device-id",
    dest="device_id",
    help="Device ID to investigate",
    default="f394742f39214c908476c01623bf4bcd",
)
parser.add_argument(
    "--base-url",
    default="http://localhost:8000/api",
    dest="base_url",
    help="Base URL for the API (default: http://localhost:8000/api)",
)
parser.add_argument(
    "--ws-url",
    default="ws://localhost:8000/ws",
    dest="ws_url",
    help="WebSocket URL (default: ws://localhost:8000/ws)",
)
parser.add_argument(
    "--parallel",
    action="store_true",
    default=True,
    help="Run investigation agents in parallel (default: True)",
)
parser.add_argument(
    "--sequential",
    action="store_true",
    help="Run investigation agents sequentially (overrides --parallel)",
)
args = parser.parse_args()

device_id = args.device_id
entity_type = "device_id"
BASE_URL = args.base_url
WS_URL = args.ws_url

# Determine execution mode
parallel_execution = args.parallel and not args.sequential
if args.sequential:
    parallel_execution = False
    print("🔄 Sequential execution mode enabled")
else:
    print("⚡ Parallel execution mode enabled")

headers = {
    "Authorization": "Olorin_APIKey olorin_apikey=preprdakyres3AVWXWEiZESQdOnynrcYt9h9wwfR,olorin_apikey_version=1.0",
    "Content-Type": "application/json",
    "X-Forwarded-Port": "8090",
    "olorin_experience_id": "d3d28eaa-7ca9-4aa2-8905-69ac11fd8c58",
    "olorin_originating_assetalias": "Olorin.cas.hri.gaia",
}

# Store WebSocket messages for PDF generation
websocket_messages = Queue()
investigation_data = {}
real_investigation_id = None


def print_response(resp):
    print(f"Status: {resp.status_code}")
    try:
        print(resp.json())
    except Exception:
        print(resp.text)


async def websocket_listener(investigation_id: str):
    """Listen to WebSocket messages during autonomous investigation."""
    global real_investigation_id

    uri = f"{WS_URL}/{investigation_id}?parallel={'true' if parallel_execution else 'false'}"
    print(f"\nConnecting to WebSocket: {uri}")

    try:
        async with websockets.connect(uri) as websocket:
            print("✅ WebSocket connected successfully")

            while True:
                try:
                    message = await websocket.recv()
                    data = json.loads(message)

                    # Store message for PDF generation
                    websocket_messages.put(data)

                    # Extract real investigation ID from first message if available
                    if real_investigation_id is None:
                        message_text = data.get("message", "")
                        if "investigation" in message_text.lower():
                            import re

                            # Look for investigation ID in the message
                            match = re.search(
                                r"investigation[_\s]+([a-f0-9-]{36})",
                                message_text,
                                re.IGNORECASE,
                            )
                            if match:
                                real_investigation_id = match.group(1)
                                print(
                                    f"🔍 Real investigation ID captured: {real_investigation_id}"
                                )

                    # Print real-time updates
                    phase = data.get("phase", "unknown")
                    progress = data.get("progress", 0)
                    message_text = data.get("message", "")

                    print(f"📡 [{phase.upper()}] {progress:.1%} - {message_text}")

                    # Store detailed data if available
                    if "data" in data and data["data"]:
                        investigation_data[phase] = data["data"]
                        print(f"   📊 Received detailed {phase} data")

                    # Break if investigation is completed
                    if phase == "completed":
                        print("🎉 Investigation completed!")
                        break

                except websockets.exceptions.ConnectionClosed:
                    print("❌ WebSocket connection closed")
                    break
                except Exception as e:
                    print(f"❌ WebSocket error: {e}")
                    break

    except Exception as e:
        print(f"❌ Failed to connect to WebSocket: {e}")
        print(f"   This is expected since we don't know the real investigation ID yet")
        print(f"   The autonomous investigation is still running in the background")


def run_websocket_listener(investigation_id: str):
    """Run WebSocket listener in a separate thread."""
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    loop.run_until_complete(websocket_listener(investigation_id))


print(f"\n🚀 Starting Autonomous Investigation for {entity_type}: {device_id}")
print("=" * 60)

# Start autonomous investigation
print(f"\n1️⃣ Starting autonomous investigation...")
start_url = f"{BASE_URL}/agent/start/{device_id}"
params = {"entity_type": entity_type}

start_resp = requests.post(start_url, params=params, headers=headers)
print_response(start_resp)

if start_resp.status_code not in (200, 201):
    print(f"❌ Failed to start autonomous investigation: {start_resp.status_code}")
    exit(1)

# Extract investigation ID from response
try:
    response_data = start_resp.json()
    agent_output = response_data.get("agentOutput", {})
    plain_text = agent_output.get("plainText", "")

    # Try to extract investigation ID from the agent output
    import re

    investigation_id = None
    if plain_text:
        # Look for investigation ID pattern in the response
        match = re.search(
            r"investigation[_\s]+([a-f0-9-]{36})", plain_text, re.IGNORECASE
        )
        if match:
            investigation_id = match.group(1)

    if not investigation_id:
        # Fallback: generate a UUID and hope the WebSocket messages will contain the real one
        import uuid

        investigation_id = str(uuid.uuid4())
        print(
            f"⚠️  Could not extract investigation ID from response, using fallback: {investigation_id}"
        )
    else:
        print(f"📋 Investigation ID extracted: {investigation_id}")

except Exception as e:
    print(f"❌ Could not extract investigation ID: {e}")
    exit(1)

# Start WebSocket listener in background thread
print(f"\n2️⃣ Starting WebSocket listener for real-time updates...")
print(f"   Note: The real investigation ID will be captured from WebSocket messages")
websocket_thread = Thread(target=run_websocket_listener, args=(investigation_id,))
websocket_thread.daemon = True
websocket_thread.start()

# Wait for WebSocket to connect
time.sleep(2)

print(f"\n3️⃣ Monitoring autonomous investigation progress...")
print("   (Press Ctrl+C to stop monitoring)")

# Monitor for completion or timeout
start_time = time.time()
timeout = 300  # 5 minutes timeout
completed = False

try:
    while not completed and (time.time() - start_time) < timeout:
        time.sleep(5)

        # Check if we have completion data
        if "completed" in investigation_data:
            completed = True
            break

        # Show progress
        elapsed = time.time() - start_time
        print(f"⏱️  Elapsed: {elapsed:.0f}s - Investigation in progress...")

except KeyboardInterrupt:
    print("\n⏹️  Monitoring stopped by user")

# Collect all WebSocket messages
all_messages = []
while not websocket_messages.empty():
    all_messages.append(websocket_messages.get())

print(f"\n4️⃣ Investigation Summary")
print("=" * 40)

# Organize data by phase
phases_data = {}
for msg in all_messages:
    phase = msg.get("phase", "unknown")
    if phase not in phases_data:
        phases_data[phase] = []
    phases_data[phase].append(msg)

# Print summary
for phase, messages in phases_data.items():
    print(f"\n📊 {phase.upper()}:")
    for msg in messages:
        progress = msg.get("progress", 0)
        message_text = msg.get("message", "")
        print(f"   {progress:.1%} - {message_text}")

# --- PDF SUMMARY GENERATION ---
print(f"\n5️⃣ Generating PDF Summary...")

# Use font path relative to script location
script_dir = os.path.abspath(os.path.dirname(__file__))
font_path = os.path.join(script_dir, os.pardir, "DejaVuSans.ttf")
font_path = os.path.abspath(font_path)

if not os.path.exists(font_path):
    print(
        "WARNING: DejaVuSans.ttf font file is missing. Skipping PDF summary generation."
    )
else:
    pdf = FPDF()
    pdf.add_page()
    pdf.add_font("DejaVu", "", font_path, uni=True)
    pdf.add_font("DejaVu", "B", font_path, uni=True)

    # --- AUTHOR AND DATE ---
    pdf.set_font("DejaVu", "", 10)
    pdf.cell(0, 8, f"Created by: Autonomous Investigation System", ln=1, align="L")
    pdf.cell(0, 8, f"Date: {datetime.now().strftime('%Y-%m-%d')}", ln=1, align="L")
    pdf.ln(2)

    # --- TITLE AND HEADER ---
    pdf.set_font("DejaVu", "B", 16)
    pdf.cell(0, 15, "Autonomous Device Investigation Report", ln=1, align="C")
    pdf.ln(5)

    # --- INVESTIGATION SUMMARY TABLE ---
    pdf.set_font("DejaVu", "B", 12)
    pdf.cell(0, 10, "Investigation Summary", ln=1)
    pdf.ln(2)

    pdf.set_font("DejaVu", "", 10)

    # Calculate overall risk score from investigation data
    overall_risk = 0.0
    if "completed" in investigation_data:
        completed_data = investigation_data["completed"]
        overall_risk = completed_data.get("overallRiskScore", 0.0)

    # Use real investigation ID if captured, otherwise use the fallback
    display_investigation_id = (
        real_investigation_id if real_investigation_id else investigation_id
    )

    summary_items = [
        ("Investigation ID", display_investigation_id),
        ("Device ID", device_id),
        ("Entity Type", entity_type),
        ("Investigation Type", "Autonomous"),
        ("Overall Risk Score", f"{overall_risk:.2f}"),
        ("Status", "Completed" if completed else "In Progress"),
        ("Generated", datetime.now().strftime("%Y-%m-%d %H:%M:%S")),
    ]

    for label, value in summary_items:
        pdf.set_font("DejaVu", "B", 10)
        pdf.cell(50, 8, f"{label}:", border=1, align="L")
        pdf.set_font("DejaVu", "", 10)
        pdf.cell(0, 8, str(value), border=1, ln=1, align="L")

    pdf.ln(10)

    # --- INVESTIGATION PHASES ---
    pdf.set_font("DejaVu", "B", 12)
    pdf.cell(0, 10, "Investigation Phases", ln=1)
    pdf.ln(2)

    phase_order = [
        "initialization",
        "network_analysis",
        "location_analysis",
        "device_analysis",
        "behavior_analysis",
        "risk_assessment",
        "completed",
    ]

    for phase in phase_order:
        if phase in phases_data:
            pdf.set_font("DejaVu", "B", 11)
            pdf.cell(0, 8, f"{phase.replace('_', ' ').title()}", ln=1)

            pdf.set_font("DejaVu", "", 9)
            messages = phases_data[phase]

            for msg in messages:
                progress = msg.get("progress", 0)
                message_text = msg.get("message", "")
                pdf.cell(0, 6, f"  {progress:.1%} - {message_text}", ln=1)

            # Add detailed data if available
            if phase in investigation_data:
                data = investigation_data[phase]
                if isinstance(data, dict):
                    # Extract key metrics
                    if "risk_level" in data:
                        pdf.cell(0, 6, f"  Risk Level: {data['risk_level']:.2f}", ln=1)
                    if "confidence" in data:
                        pdf.cell(0, 6, f"  Confidence: {data['confidence']:.2f}", ln=1)
                    if "summary" in data:
                        pdf.set_font("DejaVu", "", 8)
                        pdf.multi_cell(
                            0, 5, f"  Summary: {data['summary'][:200]}...", border=0
                        )
                        pdf.set_font("DejaVu", "", 9)

            pdf.ln(5)

    # --- DETAILED RESULTS ---
    if investigation_data:
        pdf.set_font("DejaVu", "B", 12)
        pdf.cell(0, 10, "Detailed Results", ln=1)
        pdf.ln(2)

        for phase, data in investigation_data.items():
            if isinstance(data, dict) and phase != "completed":
                pdf.set_font("DejaVu", "B", 10)
                pdf.cell(0, 8, f"{phase.replace('_', ' ').title()} Results:", ln=1)

                pdf.set_font("DejaVu", "", 9)

                # Risk assessment details
                risk_key = None
                if "network_risk_assessment" in data:
                    risk_key = "network_risk_assessment"
                elif "location_risk_assessment" in data:
                    risk_key = "location_risk_assessment"
                elif "llm_assessment" in data:
                    risk_key = "llm_assessment"
                elif "risk_assessment" in data:
                    risk_key = "risk_assessment"

                if risk_key and isinstance(data[risk_key], dict):
                    risk_data = data[risk_key]

                    if "risk_level" in risk_data:
                        pdf.cell(
                            0, 6, f"  Risk Level: {risk_data['risk_level']:.2f}", ln=1
                        )
                    if "confidence" in risk_data:
                        pdf.cell(
                            0, 6, f"  Confidence: {risk_data['confidence']:.2f}", ln=1
                        )
                    if "risk_factors" in risk_data and risk_data["risk_factors"]:
                        pdf.cell(0, 6, "  Risk Factors:", ln=1)
                        for factor in risk_data["risk_factors"][:3]:  # Limit to top 3
                            pdf.cell(0, 5, f"    • {factor[:80]}...", ln=1)
                    if "thoughts" in risk_data:
                        pdf.set_font("DejaVu", "", 8)
                        thoughts = (
                            risk_data["thoughts"][:300] + "..."
                            if len(risk_data["thoughts"]) > 300
                            else risk_data["thoughts"]
                        )
                        pdf.multi_cell(0, 4, f"  Analysis: {thoughts}", border=0)
                        pdf.set_font("DejaVu", "", 9)

                # Device-specific data
                if phase == "device_analysis" and "retrieved_signals" in data:
                    signals = data["retrieved_signals"]
                    if signals:
                        pdf.cell(
                            0, 6, f"  Device Signals: {len(signals)} records", ln=1
                        )

                        # Show sample device signals
                        for i, signal in enumerate(signals[:3]):  # Show first 3 signals
                            if isinstance(signal, dict):
                                device_id_val = signal.get("device_id", "Unknown")
                                pdf.cell(
                                    0,
                                    5,
                                    f"    Signal {i+1}: Device {device_id_val}",
                                    ln=1,
                                )

                pdf.ln(5)

    # --- DEVICE-SPECIFIC ANALYSIS ---
    if investigation_data:
        pdf.set_font("DejaVu", "B", 12)
        pdf.cell(0, 10, "Device Analysis Summary", ln=1)
        pdf.ln(2)

        # Device fingerprinting results
        if "device_analysis" in investigation_data:
            device_data = investigation_data["device_analysis"]
            pdf.set_font("DejaVu", "", 10)

            if "retrieved_signals" in device_data:
                signal_count = len(device_data["retrieved_signals"])
                pdf.cell(0, 6, f"Device Signals Analyzed: {signal_count}", ln=1)

            if "llm_assessment" in device_data:
                assessment = device_data["llm_assessment"]
                if isinstance(assessment, dict):
                    risk_level = assessment.get("risk_level", 0)
                    confidence = assessment.get("confidence", 0)
                    pdf.cell(0, 6, f"Device Risk Level: {risk_level:.2f}", ln=1)
                    pdf.cell(0, 6, f"Assessment Confidence: {confidence:.2f}", ln=1)

                    if "risk_factors" in assessment:
                        pdf.cell(0, 6, "Key Device Risk Factors:", ln=1)
                        for factor in assessment["risk_factors"][:5]:
                            pdf.set_font("DejaVu", "", 9)
                            pdf.cell(0, 5, f"  • {factor[:100]}...", ln=1)
                            pdf.set_font("DejaVu", "", 10)

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
        "Autonomous Device Investigation System - Real-time Fraud Detection",
        ln=1,
        align="C",
    )

    pdf_filename = f"autonomous_investigation_device_{device_id}.pdf"
    pdf.output(pdf_filename)
    print(f"📄 PDF summary saved as {pdf_filename}")

print(f"\n✅ Autonomous investigation test completed!")
print(f"📊 Total WebSocket messages received: {len(all_messages)}")
print(f"🔍 Investigation phases completed: {len(phases_data)}")

if completed:
    print("🎉 Investigation completed successfully!")
else:
    print("⚠️  Investigation may still be in progress or timed out")
