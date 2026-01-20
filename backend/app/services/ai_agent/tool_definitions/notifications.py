"""Notification tool definitions."""

NOTIFICATION_TOOLS = [
    {
        "name": "send_email_notification",
        "description": "Send an email notification to administrators about major issues found during the audit. Only use for significant problems requiring immediate attention.",
        "input_schema": {
            "type": "object",
            "properties": {
                "severity": {
                    "type": "string",
                    "description": "Severity level of the issues",
                    "enum": ["high", "critical"],
                },
                "subject": {
                    "type": "string",
                    "description": "Email subject line (should be concise and attention-grabbing)"
                },
                "summary": {
                    "type": "string",
                    "description": "Brief summary of what was found (2-3 sentences)"
                },
                "critical_issues": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "title": {"type": "string"},
                            "description": {"type": "string"},
                            "affected_items": {"type": "integer"},
                            "priority": {"type": "string", "enum": ["high", "critical"]}
                        }
                    },
                    "description": "List of critical issues found (3-5 most important)"
                },
                "items_checked": {
                    "type": "integer",
                    "description": "Total items checked"
                },
                "issues_found": {
                    "type": "integer",
                    "description": "Total issues found"
                },
                "issues_fixed": {
                    "type": "integer",
                    "description": "Issues fixed automatically"
                },
                "manual_action_needed": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Specific actions administrators should take"
                }
            },
            "required": ["severity", "subject", "summary", "critical_issues", "items_checked", "issues_found"]
        }
    },
]
