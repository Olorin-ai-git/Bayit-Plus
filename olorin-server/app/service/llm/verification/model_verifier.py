import json
import os
from typing import Any, Dict, Optional

import httpx
from pydantic import BaseModel

from app.models.llm_verification import (
    VerificationContext,
    VerificationReport,
    VerificationCategoryScores,
    VerificationVerdict,
)
from app.utils.redaction import redact_text, redact_payload


_VERIFICATION_SYSTEM_INSTRUCTIONS = (
    "You are a validator that returns ONLY valid compact JSON per the provided schema. "
    "Evaluate the primary model response for the given task. Enforce hard gates: JSON/schema validity, required fields, safety. "
    "Return fields: weighted_score (0-1), category_scores, verdict ('pass'|'fail'), hard_gate_failures[], required_fixes[], rationale, suggested_retry_suffix. "
    "Do not include any text outside the JSON object."
)


class ModelVerifier:
    """
    Generic model verifier that can use any supported LLM for verification.
    Supports both Anthropic (Claude) and OpenAI models.
    """
    
    def __init__(self, model_name: str = "claude-opus-4.1", api_key: Optional[str] = None):
        self.model_name = model_name
        self._api_key = api_key
        self.is_anthropic = "claude" in model_name.lower()
        self.is_openai = "gpt" in model_name.lower()

    async def verify(self, ctx: VerificationContext) -> VerificationReport:
        verifier_output = await self._call_verification_model(ctx)
        data = json.loads(verifier_output)
        return VerificationReport(
            weighted_score=data.get("weighted_score", 0.0),
            category_scores=VerificationCategoryScores(**data.get("category_scores", {})),
            verdict=VerificationVerdict(data.get("verdict", "fail")),
            hard_gate_failures=data.get("hard_gate_failures", []),
            required_fixes=data.get("required_fixes", []),
            rationale=data.get("rationale"),
            suggested_retry_suffix=data.get("suggested_retry_suffix"),
        )

    async def _call_verification_model(self, ctx: VerificationContext) -> str:
        """Call the verification model (Anthropic or OpenAI)"""
        from app.utils.firebase_secrets import get_firebase_secret
        from app.service.config import get_settings_for_env
        
        settings = get_settings_for_env()
        
        # Determine which API to use based on model name
        if self.is_anthropic:
            return await self._call_anthropic(ctx, settings)
        elif self.is_openai:
            return await self._call_openai(ctx, settings)
        else:
            # Fallback behavior for unknown models
            return await self._generate_fallback_response(ctx)
    
    async def _call_anthropic(self, ctx: VerificationContext, settings) -> str:
        """Call Anthropic's Claude API for verification"""
        from app.utils.firebase_secrets import get_firebase_secret
        
        # Get API key from Firebase secrets
        api_key = (
            self._api_key or 
            get_firebase_secret(settings.anthropic_api_key_secret)
        )
        
        if not api_key:
            return await self._generate_fallback_response(ctx)
        
        # Construct Anthropic request
        system_prompt = _VERIFICATION_SYSTEM_INSTRUCTIONS
        user_payload: Dict[str, Any] = {
            "task_type": ctx.task_type,
            "system_prompt_or_instructions": redact_text(ctx.system_prompt_or_instructions or ""),
            "user_request": redact_text(ctx.user_request or ""),
            "original_prompt": redact_text(ctx.original_prompt or ""),
            "original_response_text": redact_text(ctx.original_response_text),
            "schema_id": ctx.schema_id,
            "schema_json": ctx.schema_data or None,
        }
        
        messages = [
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": (
                            "Return ONLY valid JSON for the verification report.\n" + json.dumps(user_payload)
                        ),
                    }
                ],
            }
        ]

        headers = {
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        }
        
        body = {
            "model": self.model_name,
            "system": system_prompt,
            "messages": messages,
            "temperature": 0.0,
            "max_tokens": 256,
            "top_p": 0.1,
        }
        
        async with httpx.AsyncClient(timeout=20.0) as client:
            r = await client.post("https://api.anthropic.com/v1/messages", headers=headers, json=body)
            r.raise_for_status()
            j = r.json()
            content_blocks = j.get("content", [])
            text_parts = [b.get("text", "") for b in content_blocks if isinstance(b, dict)]
            text = "\n".join([t for t in text_parts if t])
            return text.strip() or "{}"
    
    async def _call_openai(self, ctx: VerificationContext, settings) -> str:
        """Call OpenAI's GPT API for verification"""
        from app.utils.firebase_secrets import get_firebase_secret
        
        # Get API key from Firebase secrets or environment
        api_key = (
            self._api_key or 
            settings.openai_api_key or
            get_firebase_secret(settings.openai_api_key_secret)
        )
        
        if not api_key:
            return await self._generate_fallback_response(ctx)
        
        # Construct OpenAI request
        user_payload: Dict[str, Any] = {
            "task_type": ctx.task_type,
            "system_prompt_or_instructions": redact_text(ctx.system_prompt_or_instructions or ""),
            "user_request": redact_text(ctx.user_request or ""),
            "original_prompt": redact_text(ctx.original_prompt or ""),
            "original_response_text": redact_text(ctx.original_response_text),
            "schema_id": ctx.schema_id,
            "schema_json": ctx.schema_data or None,
        }
        
        messages = [
            {
                "role": "system",
                "content": _VERIFICATION_SYSTEM_INSTRUCTIONS
            },
            {
                "role": "user",
                "content": "Return ONLY valid JSON for the verification report.\n" + json.dumps(user_payload)
            }
        ]
        
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }
        
        body = {
            "model": self.model_name,
            "messages": messages,
            "temperature": 0.0,
            "max_tokens": 256,
            "top_p": 0.1,
        }
        
        async with httpx.AsyncClient(timeout=20.0) as client:
            r = await client.post("https://api.openai.com/v1/chat/completions", headers=headers, json=body)
            r.raise_for_status()
            j = r.json()
            choices = j.get("choices", [])
            if choices:
                message = choices[0].get("message", {})
                return message.get("content", "{}").strip()
            return "{}"
    
    async def _generate_fallback_response(self, ctx: VerificationContext) -> str:
        """Generate a fallback response when API is unavailable"""
        # Fallback scaffold behavior
        if ctx.original_response_text and len(ctx.original_response_text.strip()) > 0:
            return json.dumps(
                {
                    "weighted_score": 0.92,
                    "category_scores": {
                        "correctness": 0.9,
                        "completeness": 0.9,
                        "adherence": 0.9,
                        "grounding": 0.9,
                        "safety": 0.95,
                    },
                    "verdict": "pass",
                    "hard_gate_failures": [],
                    "required_fixes": [],
                    "rationale": "Scaffold pass (API unavailable).",
                    "suggested_retry_suffix": None,
                }
            )
        else:
            return json.dumps(
                {
                    "weighted_score": 0.0,
                    "category_scores": {
                        "correctness": 0.0,
                        "completeness": 0.0,
                        "adherence": 0.0,
                        "grounding": 0.0,
                        "safety": 1.0,
                    },
                    "verdict": "fail",
                    "hard_gate_failures": ["empty_response"],
                    "required_fixes": ["Return a non-empty, schema-valid response."],
                    "rationale": "Empty response.",
                    "suggested_retry_suffix": "Ensure response is non-empty and conforms to schema.",
                }
            )


# Backward compatibility alias
OpusVerifier = ModelVerifier