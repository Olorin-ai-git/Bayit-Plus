#!/usr/bin/env python3
"""
Simple HTML Report Generation Test

Tests a simplified HTML report generation that actually works with existing investigation data.
"""

import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

# Add the app directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

def generate_simple_html_report(investigation_folder_path: str) -> str:
    """Generate a simple HTML report from investigation folder data"""
    
    folder_path = Path(investigation_folder_path)
    if not folder_path.exists():
        raise FileNotFoundError(f"Investigation folder not found: {folder_path}")
    
    # Read investigation data
    metadata_file = folder_path / "metadata.json"
    autonomous_file = folder_path / "autonomous_activities.jsonl" 
    journey_file = folder_path / "journey_tracking.json"
    log_file = folder_path / "investigation.log"
    
    # Load metadata
    metadata = {}
    if metadata_file.exists():
        with open(metadata_file) as f:
            metadata = json.load(f)
    
    # Load autonomous activities
    activities = []
    if autonomous_file.exists():
        with open(autonomous_file) as f:
            for line in f:
                try:
                    activities.append(json.loads(line.strip()))
                except:
                    pass
    
    # Load journey data
    journey_data = {}
    if journey_file.exists():
        try:
            with open(journey_file) as f:
                journey_data = json.load(f)
        except:
            pass
    
    # Load log entries
    log_entries = []
    if log_file.exists():
        try:
            with open(log_file) as f:
                log_entries = f.readlines()
        except:
            pass
    
    # Generate HTML report
    html_content = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Investigation Report - {metadata.get('investigation_id', 'Unknown')}</title>
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js"></script>
        <style>
            body {{
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                margin: 0;
                padding: 20px;
                background: #f8fafc;
                color: #1a202c;
            }}
            .container {{
                max-width: 1200px;
                margin: 0 auto;
                background: white;
                border-radius: 12px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.1);
                padding: 30px;
            }}
            .header {{
                border-bottom: 2px solid #e2e8f0;
                padding-bottom: 20px;
                margin-bottom: 30px;
            }}
            .title {{
                font-size: 2.5rem;
                font-weight: bold;
                color: #2d3748;
                margin-bottom: 10px;
            }}
            .metadata {{
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 20px;
                margin-bottom: 30px;
            }}
            .metric {{
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 20px;
                border-radius: 10px;
                text-align: center;
            }}
            .metric-value {{
                font-size: 2rem;
                font-weight: bold;
                display: block;
            }}
            .metric-label {{
                font-size: 0.9rem;
                opacity: 0.9;
            }}
            .section {{
                margin-bottom: 40px;
                border: 1px solid #e2e8f0;
                border-radius: 10px;
                padding: 25px;
            }}
            .section-title {{
                font-size: 1.5rem;
                font-weight: 600;
                color: #2d3748;
                margin-bottom: 20px;
                display: flex;
                align-items: center;
                gap: 10px;
            }}
            .activity-item {{
                background: #f7fafc;
                border-left: 4px solid #4299e1;
                padding: 15px;
                margin-bottom: 10px;
                border-radius: 0 6px 6px 0;
            }}
            .activity-type {{
                font-weight: 600;
                color: #2b6cb0;
            }}
            .activity-time {{
                font-size: 0.85rem;
                color: #718096;
                margin-bottom: 5px;
            }}
            .log-entry {{
                font-family: 'Monaco', 'Consolas', monospace;
                font-size: 0.85rem;
                background: #2d3748;
                color: #e2e8f0;
                padding: 8px 12px;
                margin-bottom: 5px;
                border-radius: 4px;
                overflow-x: auto;
            }}
            .chart-container {{
                position: relative;
                height: 400px;
                margin: 20px 0;
            }}
            .mermaid {{
                text-align: center;
                margin: 20px 0;
            }}
            .risk-high {{ border-left-color: #e53e3e; }}
            .risk-medium {{ border-left-color: #d69e2e; }}
            .risk-low {{ border-left-color: #38a169; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="title">🔍 Investigation Report</div>
                <div style="color: #718096; font-size: 1.1rem;">
                    {metadata.get('investigation_id', 'Unknown ID')} • 
                    {metadata.get('mode', 'Unknown Mode')} • 
                    {metadata.get('scenario', 'Unknown Scenario')}
                </div>
            </div>
            
            <div class="metadata">
                <div class="metric">
                    <span class="metric-value">{metadata.get('mode', 'N/A')}</span>
                    <span class="metric-label">Investigation Mode</span>
                </div>
                <div class="metric">
                    <span class="metric-value">{len(activities)}</span>
                    <span class="metric-label">Activities Recorded</span>
                </div>
                <div class="metric">
                    <span class="metric-value">{len(journey_data.get('node_executions', []))}</span>
                    <span class="metric-label">Nodes Executed</span>
                </div>
                <div class="metric">
                    <span class="metric-value">{journey_data.get('final_state', {}).get('final_risk_score', 'N/A')}</span>
                    <span class="metric-label">Final Risk Score</span>
                </div>
            </div>
            
            <div class="section">
                <div class="section-title">🧠 LLM Interactions Timeline</div>
                <div class="chart-container">
                    <canvas id="llmChart"></canvas>
                </div>
            </div>
            
            <div class="section">
                <div class="section-title">🔄 Investigation Flow</div>
                <div class="mermaid">
                    graph TD
                        A[Investigation Started] --> B[Device Analysis]
                        B --> C[Location Verification]
                        C --> D[Risk Assessment] 
                        D --> E[Investigation Completed]
                        
                        classDef default fill:#e3f2fd,stroke:#1976d2,stroke-width:2px
                        classDef completed fill:#e8f5e8,stroke:#4caf50,stroke-width:2px
                        
                        class B,C,D,E completed
                </div>
            </div>
            
            <div class="section">
                <div class="section-title">📊 Activity Log</div>
    """
    
    # Add activities
    llm_interactions = []
    for activity in activities:
        activity_type = activity.get('interaction_type', 'unknown')
        data = activity.get('data', {})
        timestamp = data.get('timestamp', '')
        
        if activity_type == 'llm_call':
            tokens = data.get('tokens_used', {}).get('total_tokens', 0)
            llm_interactions.append({
                'timestamp': timestamp,
                'tokens': tokens,
                'agent': data.get('agent_name', 'unknown')
            })
        
        # Determine risk level for styling
        risk_class = "risk-low"
        if activity_type in ['agent_decision', 'investigation_progress']:
            risk_score = data.get('decision_outcome', {}).get('risk_score') or data.get('findings_summary', {}).get('risk_score', 0)
            if risk_score and float(risk_score) > 0.7:
                risk_class = "risk-high"
            elif risk_score and float(risk_score) > 0.4:
                risk_class = "risk-medium"
        
        html_content += f"""
                <div class="activity-item {risk_class}">
                    <div class="activity-time">{timestamp}</div>
                    <div class="activity-type">{activity_type.replace('_', ' ').title()}</div>
                    <div style="font-size: 0.9rem; margin-top: 5px;">
        """
        
        if activity_type == 'llm_call':
            html_content += f"Agent: {data.get('agent_name', 'N/A')} | Model: {data.get('model_name', 'N/A')} | Tokens: {data.get('tokens_used', {}).get('total_tokens', 0)}"
        elif activity_type == 'tool_execution':
            html_content += f"Tool: {data.get('tool_name', 'N/A')} | Success: {data.get('success', False)} | Duration: {data.get('execution_time_ms', 0)}ms"
        elif activity_type == 'agent_decision':
            html_content += f"Decision: {data.get('decision_type', 'N/A')} | Confidence: {data.get('confidence_score', 0):.2f}"
        
        html_content += "</div></div>"
    
    # Close sections and add JavaScript
    html_content += f"""
            </div>
            
            <div class="section">
                <div class="section-title">📝 Investigation Logs</div>
    """
    
    for log_entry in log_entries[:10]:  # Show first 10 log entries
        html_content += f'<div class="log-entry">{log_entry.strip()}</div>'
    
    html_content += f"""
            </div>
        </div>
        
        <script>
            // Initialize Mermaid
            mermaid.initialize({{ theme: 'default' }});
            
            // LLM Interactions Chart
            const ctx = document.getElementById('llmChart').getContext('2d');
            new Chart(ctx, {{
                type: 'line',
                data: {{
                    labels: {[f"Activity {i+1}" for i in range(len(llm_interactions))]},
                    datasets: [{{
                        label: 'Token Usage',
                        data: {[interaction['tokens'] for interaction in llm_interactions]},
                        borderColor: '#4299e1',
                        backgroundColor: 'rgba(66, 153, 225, 0.1)',
                        tension: 0.4,
                        fill: true
                    }}]
                }},
                options: {{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {{
                        title: {{
                            display: true,
                            text: 'LLM Token Usage Over Time'
                        }}
                    }},
                    scales: {{
                        y: {{
                            beginAtZero: true,
                            title: {{
                                display: true,
                                text: 'Tokens'
                            }}
                        }}
                    }}
                }}
            }});
        </script>
    </body>
    </html>
    """
    
    # Save the report
    report_file = folder_path / "investigation_report.html"
    with open(report_file, 'w', encoding='utf-8') as f:
        f.write(html_content)
    
    return str(report_file)

def test_simple_html_generation():
    """Test simple HTML report generation"""
    print("🧪 Testing Simple HTML Report Generation...")
    
    try:
        # Find investigation folders
        from app.service.logging.investigation_folder_manager import get_folder_manager
        
        folder_manager = get_folder_manager()
        investigations = folder_manager.list_investigations()
        
        if not investigations:
            print("❌ No investigation folders found")
            return False
        
        investigation = investigations[0]
        folder_path = investigation.folder_path
        
        print(f"📁 Processing investigation: {investigation.investigation_id}")
        print(f"   Path: {folder_path}")
        
        # Generate HTML report
        report_path = generate_simple_html_report(folder_path)
        
        if Path(report_path).exists():
            report_size = Path(report_path).stat().st_size
            print(f"✅ HTML report generated successfully!")
            print(f"   📄 Report: {report_path}")
            print(f"   📊 Size: {report_size:,} bytes")
            
            # Check content
            with open(report_path) as f:
                content = f.read()
                if "Investigation Report" in content and "LLM Interactions" in content:
                    print("✅ Report contains expected content")
                    return True
                else:
                    print("⚠️  Report missing expected content")
                    return False
        else:
            print("❌ Report file was not created")
            return False
            
    except Exception as e:
        print(f"❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_simple_html_generation()
    if success:
        print("\n🎉 Simple HTML Report Generation Test PASSED!")
        print("🚀 Ready for enhanced HTML report implementation!")
    else:
        print("\n❌ Test FAILED!")
    sys.exit(0 if success else 1)