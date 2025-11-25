#!/usr/bin/env python3
"""
Script to run remediation agent on existing investigation results to generate entity labels.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import asyncio

from sqlalchemy.orm import Session

from app.models.investigation_state import InvestigationState
from app.persistence.database import get_db
from app.service.agent.orchestration.remediation_agent import remediation_agent_node
from app.service.agent.orchestration.state_schema import InvestigationState as StateType


async def run_remediation_for_entity(entity_id: str, entity_type: str = "email"):
    """Run remediation agent for a specific entity."""
    import json

    from sqlalchemy import or_

    db: Session = next(get_db())

    # Find investigations by searching in settings_json and progress_json
    # Entity info is stored in settings_json.entity_id and settings_json.entity_type
    all_investigations = (
        db.query(InvestigationState)
        .filter(InvestigationState.status == "COMPLETED")
        .order_by(InvestigationState.created_at.desc())
        .all()
    )

    # Filter by entity_id and entity_type from JSON fields
    # Entity is stored in settings.entities[0].entity_value and settings.entities[0].entity_type
    matching_investigations = []
    for inv in all_investigations:
        settings = inv.settings or {}
        progress = inv.get_progress_data()

        # Check settings.entities array
        entities = settings.get("entities", [])
        if entities and len(entities) > 0:
            entity_data = entities[0]
            if (
                entity_data.get("entity_value") == entity_id
                and entity_data.get("entity_type") == entity_type
            ):
                matching_investigations.append(inv)
                continue

        # Fallback: check direct fields
        if (
            settings.get("entity_id") == entity_id
            and settings.get("entity_type") == entity_type
        ):
            matching_investigations.append(inv)
        elif (
            progress.get("entity_id") == entity_id
            and progress.get("entity_type") == entity_type
        ):
            matching_investigations.append(inv)

    if not matching_investigations:
        print(f"❌ No completed investigation found for {entity_type}:{entity_id}")
        print(f"   Searched {len(all_investigations)} completed investigations")
        return

    investigation = matching_investigations[0]  # Use most recent
    settings = investigation.settings or {}
    progress = investigation.get_progress_data()

    # Extract entity info from settings.entities array
    entities = settings.get("entities", [])
    if entities and len(entities) > 0:
        entity_data = entities[0]
        inv_entity_id = entity_data.get("entity_value")
        inv_entity_type = entity_data.get("entity_type")
    else:
        # Fallback to direct fields
        inv_entity_id = settings.get("entity_id") or progress.get("entity_id")
        inv_entity_type = settings.get("entity_type") or progress.get("entity_type")

    # Extract risk score from multiple possible locations
    # Priority: domain_findings.risk.risk_score > progress.risk_score > progress.overall_risk_score
    overall_risk_score = None
    domain_findings = progress.get("domain_findings", {})
    if domain_findings and "risk" in domain_findings:
        risk_findings = domain_findings.get("risk", {})
        if isinstance(risk_findings, dict):
            overall_risk_score = risk_findings.get("risk_score")

    # Fallback to top-level progress fields
    if overall_risk_score is None:
        overall_risk_score = (
            progress.get("risk_score")
            or progress.get("overall_risk_score")
            or settings.get("overall_risk_score")
        )

    print(f"✅ Found investigation: {investigation.investigation_id}")
    print(f"   Entity: {inv_entity_type}:{inv_entity_id}")
    print(f"   Risk Score: {overall_risk_score}")
    print(f"   Status: {investigation.status}")

    if overall_risk_score is None:
        print(f"⚠️ No risk score found in investigation data")
        return

    # Create investigation state from database record
    state: StateType = {
        "investigation_id": investigation.investigation_id,
        "entity_id": inv_entity_id,
        "entity_type": inv_entity_type,
        "overall_risk_score": overall_risk_score,
        "messages": [],
        "tool_results": {},
        "domain_findings": {},
        "remediation_actions": [],
        "remediation_completed": False,
    }

    # Run remediation agent
    print(f"\n🛡️ Running remediation agent...")
    try:
        updates = await remediation_agent_node(state)

        if updates.get("remediation_completed"):
            label = updates.get("entity_label", "UNKNOWN")
            print(f"✅ Remediation completed!")
            print(f"   Entity Label: {label}")
            print(f"   Actions: {len(updates.get('remediation_actions', []))}")
            for action in updates.get("remediation_actions", []):
                print(f"      - {action.get('action')}: {action.get('label', 'N/A')}")
        else:
            print(f"⚠️ Remediation did not complete")
            print(f"   Updates: {updates}")
    except Exception as e:
        print(f"❌ Error running remediation agent: {e}")
        import traceback

        traceback.print_exc()


if __name__ == "__main__":
    entity_id = "moeller2media@gmail.com"
    entity_type = "email"

    if len(sys.argv) > 1:
        entity_id = sys.argv[1]
    if len(sys.argv) > 2:
        entity_type = sys.argv[2]

    print(f"Running remediation agent for {entity_type}:{entity_id}\n")
    asyncio.run(run_remediation_for_entity(entity_id, entity_type))
