import asyncio
import json
import os
import time
from typing import Optional

from app.models.llm_verification import VerificationContext, VerificationPolicy
from app.service.llm.verification.log_store import verification_log_store
from app.service.llm.verification.model_verifier import ModelVerifier
from app.utils.json_schema import validate_json_against_schema


def _load_risk_schema() -> Optional[dict]:
    try:
        schema_path = os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
            "schemas",
            "risk_analysis.v1.json",
        )
        with open(schema_path, "r") as f:
            return json.load(f)
    except Exception:
        return None


class VerifiedOpenAIClient:
    def __init__(
        self,
        openai_caller,
        verifier: Optional[ModelVerifier] = None,
        policy: Optional[VerificationPolicy] = None,
    ):
        self.openai_caller = openai_caller
        self.verifier = verifier or ModelVerifier()
        self.policy = policy or VerificationPolicy(
            threshold=0.85, max_retries=1, min_adherence=0.8, min_safety=0.9
        )
        self._risk_schema = _load_risk_schema()

    async def complete_with_verification(
        self, *, request_id: str, task_type: str, prompt: str
    ) -> str:
        attempts = 0
        last_response = None
        total_verification_ms = 0.0
        final_passed = False
        while attempts <= self.policy.max_retries:
            attempts += 1
            response_text = await self.openai_caller(prompt)
            last_response = response_text

            ctx = VerificationContext(
                request_id=request_id,
                task_type=task_type,
                original_prompt=prompt,
                original_response_text=response_text,
                schema_id=(
                    "risk_analysis.v1"
                    if (task_type == "risk_analysis" and self._risk_schema)
                    else None
                ),
                schema_data=(
                    self._risk_schema if (task_type == "risk_analysis") else None
                ),
            )
            t0 = time.perf_counter()
            report = await self.verifier.verify(ctx)
            dt_ms = (time.perf_counter() - t0) * 1000.0
            total_verification_ms += dt_ms

            if self.policy.is_passing(report):
                # Enforce local JSON schema hard-gate when applicable
                if task_type == "risk_analysis" and self._risk_schema:
                    try:
                        payload = json.loads(response_text)
                        is_valid, errors = validate_json_against_schema(
                            payload, self._risk_schema
                        )
                        if not is_valid:
                            # Treat as failure; craft a retry suffix and continue
                            retry_suffix = "Ensure the response conforms to risk_analysis.v1 schema and include all required fields."
                            prompt = f"{prompt}\n\nRefinement: {retry_suffix}"
                            if attempts <= self.policy.max_retries:
                                continue
                            else:
                                break
                    except Exception:
                        # If parsing fails, continue loop as failure
                        if attempts <= self.policy.max_retries:
                            prompt = f"{prompt}\n\nRefinement: Return valid JSON matching the schema; avoid extra text."
                            continue
                final_passed = True
                break

            # If failing and no more retries, break
            if attempts > self.policy.max_retries:
                break

            # Compose retry prompt
            retry_suffix = (
                report.suggested_retry_suffix
                or "Please strictly follow the JSON schema and ensure completeness."
            )
            prompt = f"{prompt}\n\nRefinement: {retry_suffix}"

        # Record metrics
        await verification_log_store.record(
            added_ms=total_verification_ms, passed=final_passed
        )
        return last_response or ""
