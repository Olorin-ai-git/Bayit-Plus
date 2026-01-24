"""Integrity and cleanup tool definitions including YouTube link validation."""

INTEGRITY_TOOLS = [
    {
        "name": "get_integrity_status",
        "description": "Get a summary of all data integrity issues: orphaned GCS files, orphaned Content records, and stuck upload jobs.",
        "input_schema": {"type": "object", "properties": {}, "required": []},
    },
    {
        "name": "find_orphaned_gcs_files",
        "description": "Find files in Google Cloud Storage that have no corresponding Content record in the database.",
        "input_schema": {
            "type": "object",
            "properties": {
                "prefix": {
                    "type": "string",
                    "description": "Optional GCS path prefix to filter (e.g., 'movies/', 'seriess/')",
                },
                "limit": {
                    "type": "integer",
                    "description": "Maximum number of orphans to return (default 100)",
                    "default": 100,
                },
            },
            "required": [],
        },
    },
    {
        "name": "find_orphaned_content_records",
        "description": "Find Content records in the database whose GCS files no longer exist.",
        "input_schema": {
            "type": "object",
            "properties": {
                "limit": {
                    "type": "integer",
                    "description": "Maximum number of orphans to return (default 100)",
                    "default": 100,
                }
            },
            "required": [],
        },
    },
    {
        "name": "find_stuck_upload_jobs",
        "description": "Find upload jobs that are stuck in processing state for too long.",
        "input_schema": {
            "type": "object",
            "properties": {
                "threshold_minutes": {
                    "type": "integer",
                    "description": "Time after which a job is considered stuck (default 30 minutes)",
                    "default": 30,
                }
            },
            "required": [],
        },
    },
    {
        "name": "cleanup_orphans",
        "description": "Clean up orphaned data: delete orphaned GCS files and/or Content records. Use dry_run=true first to preview.",
        "input_schema": {
            "type": "object",
            "properties": {
                "cleanup_type": {
                    "type": "string",
                    "description": "What to clean: 'gcs' for files, 'content' for records, 'all' for both",
                    "enum": ["gcs", "content", "all"],
                    "default": "all",
                },
                "dry_run": {
                    "type": "boolean",
                    "description": "If true, only report what would be cleaned (default true)",
                    "default": True,
                },
                "limit": {
                    "type": "integer",
                    "description": "Maximum number of items to clean per category (default 100)",
                    "default": 100,
                },
            },
            "required": [],
        },
    },
    {
        "name": "recover_stuck_jobs",
        "description": "Recover stuck upload jobs by marking them as failed and optionally requeuing for retry. Use dry_run=true first.",
        "input_schema": {
            "type": "object",
            "properties": {
                "dry_run": {
                    "type": "boolean",
                    "description": "If true, only report what would be recovered (default true)",
                    "default": True,
                },
                "threshold_minutes": {
                    "type": "integer",
                    "description": "Time after which a job is considered stuck (default 30 minutes)",
                    "default": 30,
                },
            },
            "required": [],
        },
    },
    {
        "name": "run_full_cleanup",
        "description": "Run a comprehensive cleanup of all integrity issues. Use dry_run=true first to preview all actions.",
        "input_schema": {
            "type": "object",
            "properties": {
                "dry_run": {
                    "type": "boolean",
                    "description": "If true, only report what would be cleaned up (default true)",
                    "default": True,
                },
                "limit": {
                    "type": "integer",
                    "description": "Maximum number of items to clean per category (default 100)",
                    "default": 100,
                },
            },
            "required": [],
        },
    },
]
