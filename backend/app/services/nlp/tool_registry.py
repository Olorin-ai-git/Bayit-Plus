"""
Tool Registry - Defines available tools for NLP agent execution.

Provides base CLI tools (web search, email, PDF generation, etc.) and
platform-specific tools for Bayit+, Fraud Detection, and CV Plus.
"""

from typing import Dict, List, Set

# Destructive tools that require user confirmation in smart mode
DESTRUCTIVE_TOOLS: Set[str] = {
    "deploy_platform",
    "git_push",
    "git_commit",
    "delete_content",
    "delete_user",
    "update_content_metadata",  # Bulk updates can be destructive
    "upload_content",           # Can overwrite existing content
    "run_content_audit",        # When dry_run=false, makes changes
    "execute_bash_script",      # Can execute arbitrary scripts
    "organize_series",          # When dry_run=false, modifies database
    "attach_posters",           # Modifies content metadata
    "attach_podcast_radio_posters",  # Modifies podcast/radio metadata
    "add_subtitles",            # Adds/modifies subtitle files
    "sync_podcasts",            # Syncs and potentially overwrites podcast data
    "translate_podcast",        # Generates and stores translations
    "update_podcast_covers",    # Updates podcast cover images
    "cleanup_titles",           # Modifies content titles
    "localize_content",         # Adds translations to content
    "backup_database",          # Creates backups (safe but marks as important)
    "restore_database",         # Restores database (VERY destructive)
    "upload_series",            # Uploads new content to database
    "upload_movies",            # Uploads new content to database
}

# Base CLI Tools - Available to all platforms
CLI_TOOLS: List[Dict] = [
    {
        "name": "web_search",
        "description": "Search the web for information using DuckDuckGo or Google",
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "Search query"
                },
                "num_results": {
                    "type": "integer",
                    "description": "Number of results to return",
                    "default": 5
                }
            },
            "required": ["query"]
        }
    },
    {
        "name": "download_file",
        "description": "Download file from URL to local storage or GCS",
        "input_schema": {
            "type": "object",
            "properties": {
                "url": {
                    "type": "string",
                    "description": "URL to download from"
                },
                "destination": {
                    "type": "string",
                    "description": "Optional destination path (defaults to temp directory)"
                }
            },
            "required": ["url"]
        }
    },
    {
        "name": "send_email",
        "description": "Send email with optional attachments via configured email service",
        "input_schema": {
            "type": "object",
            "properties": {
                "to": {
                    "type": "string",
                    "description": "Recipient email address"
                },
                "subject": {
                    "type": "string",
                    "description": "Email subject line"
                },
                "body": {
                    "type": "string",
                    "description": "Email body (HTML supported)"
                },
                "attachments": {
                    "type": "array",
                    "description": "List of file paths to attach",
                    "items": {"type": "string"}
                }
            },
            "required": ["to", "subject", "body"]
        }
    },
    {
        "name": "generate_pdf",
        "description": "Generate PDF report from data using template",
        "input_schema": {
            "type": "object",
            "properties": {
                "title": {
                    "type": "string",
                    "description": "Report title"
                },
                "data": {
                    "type": "object",
                    "description": "Data to include in report"
                },
                "template": {
                    "type": "string",
                    "description": "Template name (default, detailed, summary)",
                    "default": "default"
                }
            },
            "required": ["title", "data"]
        }
    },
    {
        "name": "read_file",
        "description": "Read contents of a file",
        "input_schema": {
            "type": "object",
            "properties": {
                "path": {
                    "type": "string",
                    "description": "File path to read"
                }
            },
            "required": ["path"]
        }
    },
    {
        "name": "list_directory",
        "description": "List files and directories in a path",
        "input_schema": {
            "type": "object",
            "properties": {
                "path": {
                    "type": "string",
                    "description": "Directory path to list"
                },
                "pattern": {
                    "type": "string",
                    "description": "Optional glob pattern to filter files"
                }
            },
            "required": ["path"]
        }
    },
    {
        "name": "git_status",
        "description": "Get git repository status (modified files, branch info, etc.)",
        "input_schema": {
            "type": "object",
            "properties": {
                "repository_path": {
                    "type": "string",
                    "description": "Path to git repository (defaults to current directory)",
                    "default": "."
                }
            },
            "required": []
        }
    },
    {
        "name": "git_commit",
        "description": "Create a git commit with specified message",
        "input_schema": {
            "type": "object",
            "properties": {
                "message": {
                    "type": "string",
                    "description": "Commit message"
                },
                "files": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Specific files to commit (empty for all staged files)"
                },
                "add_all": {
                    "type": "boolean",
                    "description": "Stage all modified files before committing",
                    "default": False
                },
                "dry_run": {
                    "type": "boolean",
                    "description": "If true, show what would be committed without committing",
                    "default": True
                }
            },
            "required": ["message"]
        }
    },
    {
        "name": "git_push",
        "description": "Push commits to remote repository",
        "input_schema": {
            "type": "object",
            "properties": {
                "remote": {
                    "type": "string",
                    "description": "Remote name (e.g., 'origin')",
                    "default": "origin"
                },
                "branch": {
                    "type": "string",
                    "description": "Branch name (defaults to current branch)"
                },
                "force": {
                    "type": "boolean",
                    "description": "Force push (use with caution)",
                    "default": False
                },
                "dry_run": {
                    "type": "boolean",
                    "description": "If true, show what would be pushed without pushing",
                    "default": True
                }
            },
            "required": []
        }
    },
    {
        "name": "git_pull",
        "description": "Pull latest changes from remote repository",
        "input_schema": {
            "type": "object",
            "properties": {
                "remote": {
                    "type": "string",
                    "description": "Remote name",
                    "default": "origin"
                },
                "branch": {
                    "type": "string",
                    "description": "Branch name (defaults to current branch)"
                }
            },
            "required": []
        }
    },
    {
        "name": "git_diff",
        "description": "Show git diff for changes",
        "input_schema": {
            "type": "object",
            "properties": {
                "file": {
                    "type": "string",
                    "description": "Specific file to diff (empty for all changes)"
                },
                "staged": {
                    "type": "boolean",
                    "description": "Show staged changes only",
                    "default": False
                }
            },
            "required": []
        }
    },
    {
        "name": "execute_bash_script",
        "description": "Execute a bash script from the scripts directory",
        "input_schema": {
            "type": "object",
            "properties": {
                "script_path": {
                    "type": "string",
                    "description": "Path to bash script (relative to project root or absolute)"
                },
                "args": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Command-line arguments to pass to the script",
                    "default": []
                },
                "dry_run": {
                    "type": "boolean",
                    "description": "If true, preview the command without executing",
                    "default": False
                }
            },
            "required": ["script_path"]
        }
    }
]

# Platform-specific tool mappings
PLATFORM_TOOLS: Dict[str, List[Dict]] = {
    "bayit": [
        {
            "name": "search_bayit_content",
            "description": "Search Bayit+ content library (series, movies, podcasts, radio stations)",
            "input_schema": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Search query in natural language"
                    },
                    "content_type": {
                        "type": "string",
                        "enum": ["series", "movies", "podcasts", "radio", "all"],
                        "description": "Type of content to search",
                        "default": "all"
                    },
                    "limit": {
                        "type": "integer",
                        "description": "Maximum number of results",
                        "default": 20
                    }
                },
                "required": ["query"]
            }
        },
        {
            "name": "update_content_metadata",
            "description": "Update content metadata (poster, description, tags, etc.)",
            "input_schema": {
                "type": "object",
                "properties": {
                    "content_id": {
                        "type": "string",
                        "description": "Content ObjectId"
                    },
                    "updates": {
                        "type": "object",
                        "description": "Fields to update (poster_url, description, tags, etc.)"
                    }
                },
                "required": ["content_id", "updates"]
            }
        },
        {
            "name": "upload_content",
            "description": "Upload new content to Bayit+ from URL or local path",
            "input_schema": {
                "type": "object",
                "properties": {
                    "source": {
                        "type": "string",
                        "description": "Source path or URL (supports USB paths like /Volumes/USB/Series)"
                    },
                    "content_type": {
                        "type": "string",
                        "enum": ["series", "movie", "podcast"],
                        "description": "Type of content being uploaded"
                    },
                    "filters": {
                        "type": "object",
                        "description": "Optional filters (series name, season, limit, etc.)"
                    }
                },
                "required": ["source", "content_type"]
            }
        },
        {
            "name": "get_content_stats",
            "description": "Get statistics about content library (counts, recent additions, etc.)",
            "input_schema": {
                "type": "object",
                "properties": {
                    "stat_type": {
                        "type": "string",
                        "enum": ["counts", "recent", "popular", "missing_metadata"],
                        "description": "Type of statistics to retrieve"
                    },
                    "time_period": {
                        "type": "string",
                        "description": "Time period (day, week, month, year, all)",
                        "default": "all"
                    }
                },
                "required": ["stat_type"]
            }
        },
        {
            "name": "run_content_audit",
            "description": "Run AI-powered content audit to find missing posters, duplicates, etc.",
            "input_schema": {
                "type": "object",
                "properties": {
                    "audit_type": {
                        "type": "string",
                        "enum": ["missing_posters", "duplicates", "metadata_quality", "full"],
                        "description": "Type of audit to run",
                        "default": "full"
                    },
                    "dry_run": {
                        "type": "boolean",
                        "description": "If true, only report issues without fixing",
                        "default": True
                    }
                },
                "required": ["audit_type"]
            }
        },
        {
            "name": "deploy_platform",
            "description": "Deploy Bayit+ platform to staging or production environment",
            "input_schema": {
                "type": "object",
                "properties": {
                    "environment": {
                        "type": "string",
                        "enum": ["staging", "production"],
                        "description": "Target deployment environment"
                    },
                    "platform": {
                        "type": "string",
                        "enum": ["web", "ios", "tvos", "backend", "all"],
                        "description": "Platform to deploy (web, ios, tvos, backend, or all)",
                        "default": "all"
                    },
                    "dry_run": {
                        "type": "boolean",
                        "description": "If true, show deployment plan without executing",
                        "default": True
                    }
                },
                "required": ["environment"]
            }
        },
        {
            "name": "get_deployment_status",
            "description": "Check deployment status and recent deployments",
            "input_schema": {
                "type": "object",
                "properties": {
                    "environment": {
                        "type": "string",
                        "enum": ["staging", "production", "all"],
                        "description": "Environment to check status for",
                        "default": "all"
                    }
                },
                "required": []
            }
        },
        {
            "name": "organize_series",
            "description": "Organize all series in the database - groups episodes into series, fetches TMDB metadata, creates series parent objects",
            "input_schema": {
                "type": "object",
                "properties": {
                    "dry_run": {
                        "type": "boolean",
                        "description": "If true, preview changes without making them",
                        "default": False
                    },
                    "limit": {
                        "type": "integer",
                        "description": "Limit processing to N series (for testing)",
                        "default": None
                    }
                },
                "required": []
            }
        },
        {
            "name": "attach_posters",
            "description": "Find and attach missing posters to content using TMDB API",
            "input_schema": {
                "type": "object",
                "properties": {
                    "content_type": {
                        "type": "string",
                        "enum": ["movies", "series", "all"],
                        "description": "Type of content to process",
                        "default": "all"
                    },
                    "limit": {
                        "type": "integer",
                        "description": "Limit processing to N items",
                        "default": None
                    }
                },
                "required": []
            }
        },
        {
            "name": "attach_podcast_radio_posters",
            "description": "Find and attach missing posters to podcasts and radio stations",
            "input_schema": {
                "type": "object",
                "properties": {
                    "limit": {
                        "type": "integer",
                        "description": "Limit processing to N items",
                        "default": None
                    }
                },
                "required": []
            }
        },
        {
            "name": "add_subtitles",
            "description": "Add subtitles to movies and series episodes",
            "input_schema": {
                "type": "object",
                "properties": {
                    "content_id": {
                        "type": "string",
                        "description": "Specific content ID to add subtitles to (optional)"
                    },
                    "language": {
                        "type": "string",
                        "description": "Subtitle language code (en, he, etc.)",
                        "default": "en"
                    },
                    "auto_generate": {
                        "type": "boolean",
                        "description": "Auto-generate subtitles using AI if not found",
                        "default": False
                    }
                },
                "required": []
            }
        },
        {
            "name": "sync_podcasts",
            "description": "Sync latest podcast episodes from RSS feeds",
            "input_schema": {
                "type": "object",
                "properties": {
                    "podcast_id": {
                        "type": "string",
                        "description": "Specific podcast ID to sync (syncs all if not provided)"
                    },
                    "force": {
                        "type": "boolean",
                        "description": "Force re-sync even if recently updated",
                        "default": False
                    }
                },
                "required": []
            }
        },
        {
            "name": "translate_podcast",
            "description": "Translate podcast episodes to multiple languages",
            "input_schema": {
                "type": "object",
                "properties": {
                    "podcast_id": {
                        "type": "string",
                        "description": "Podcast ID to translate"
                    },
                    "target_languages": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Target language codes (en, es, fr, etc.)",
                        "default": ["en"]
                    }
                },
                "required": ["podcast_id"]
            }
        },
        {
            "name": "update_podcast_covers",
            "description": "Update podcast covers from RSS feeds or Apple Podcasts",
            "input_schema": {
                "type": "object",
                "properties": {
                    "source": {
                        "type": "string",
                        "enum": ["rss", "apple", "both"],
                        "description": "Source to fetch covers from",
                        "default": "both"
                    }
                },
                "required": []
            }
        },
        {
            "name": "check_series_integrity",
            "description": "Verify series structure and find missing episodes",
            "input_schema": {
                "type": "object",
                "properties": {
                    "series_id": {
                        "type": "string",
                        "description": "Specific series ID to check (checks all if not provided)"
                    },
                    "fix_issues": {
                        "type": "boolean",
                        "description": "Attempt to fix found issues",
                        "default": False
                    }
                },
                "required": []
            }
        },
        {
            "name": "verify_library_integrity",
            "description": "Run comprehensive zero-trust verification of entire content library",
            "input_schema": {
                "type": "object",
                "properties": {
                    "check_type": {
                        "type": "string",
                        "enum": ["quick", "full", "deep"],
                        "description": "Depth of integrity check",
                        "default": "quick"
                    }
                },
                "required": []
            }
        },
        {
            "name": "cleanup_titles",
            "description": "Clean and normalize all content titles",
            "input_schema": {
                "type": "object",
                "properties": {
                    "dry_run": {
                        "type": "boolean",
                        "description": "Preview changes without applying",
                        "default": True
                    }
                },
                "required": []
            }
        },
        {
            "name": "localize_content",
            "description": "Add translations for content metadata (titles, descriptions, etc.)",
            "input_schema": {
                "type": "object",
                "properties": {
                    "target_languages": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Target language codes",
                        "default": ["en", "es", "fr"]
                    },
                    "content_type": {
                        "type": "string",
                        "enum": ["movies", "series", "podcasts", "all"],
                        "description": "Type of content to localize",
                        "default": "all"
                    }
                },
                "required": []
            }
        },
        {
            "name": "backup_database",
            "description": "Create a backup of the MongoDB database",
            "input_schema": {
                "type": "object",
                "properties": {
                    "collections": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Specific collections to backup (backs up all if not provided)"
                    },
                    "compress": {
                        "type": "boolean",
                        "description": "Compress backup file",
                        "default": True
                    }
                },
                "required": []
            }
        },
        {
            "name": "restore_database",
            "description": "Restore MongoDB database from backup",
            "input_schema": {
                "type": "object",
                "properties": {
                    "backup_file": {
                        "type": "string",
                        "description": "Path to backup file to restore"
                    },
                    "collections": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Specific collections to restore (restores all if not provided)"
                    }
                },
                "required": ["backup_file"]
            }
        },
        {
            "name": "find_duplicates",
            "description": "Find duplicate content in the database",
            "input_schema": {
                "type": "object",
                "properties": {
                    "content_type": {
                        "type": "string",
                        "enum": ["movies", "series", "podcasts", "all"],
                        "description": "Type of content to check for duplicates",
                        "default": "all"
                    },
                    "criteria": {
                        "type": "string",
                        "enum": ["title", "url", "hash", "all"],
                        "description": "Criteria to use for detecting duplicates",
                        "default": "title"
                    }
                },
                "required": []
            }
        },
        {
            "name": "upload_series",
            "description": "Upload series content from USB or local path",
            "input_schema": {
                "type": "object",
                "properties": {
                    "source_path": {
                        "type": "string",
                        "description": "Path to source directory (USB or local)"
                    },
                    "series_name": {
                        "type": "string",
                        "description": "Specific series name to upload (uploads all if not provided)"
                    },
                    "season": {
                        "type": "integer",
                        "description": "Specific season to upload"
                    }
                },
                "required": ["source_path"]
            }
        },
        {
            "name": "upload_movies",
            "description": "Upload movie content from USB or local path",
            "input_schema": {
                "type": "object",
                "properties": {
                    "source_path": {
                        "type": "string",
                        "description": "Path to source directory (USB or local)"
                    },
                    "filter_pattern": {
                        "type": "string",
                        "description": "Glob pattern to filter files"
                    }
                },
                "required": ["source_path"]
            }
        }
    ],
    "fraud": [
        {
            "name": "run_fraud_analysis",
            "description": "Run fraud detection analysis for specified time period",
            "input_schema": {
                "type": "object",
                "properties": {
                    "start_date": {
                        "type": "string",
                        "format": "date",
                        "description": "Start date (YYYY-MM-DD)"
                    },
                    "end_date": {
                        "type": "string",
                        "format": "date",
                        "description": "End date (YYYY-MM-DD)"
                    },
                    "analysis_type": {
                        "type": "string",
                        "enum": ["summary", "detailed", "anomalies"],
                        "description": "Type of analysis",
                        "default": "summary"
                    }
                },
                "required": ["start_date", "end_date"]
            }
        },
        {
            "name": "get_fraud_statistics",
            "description": "Get fraud detection statistics and metrics",
            "input_schema": {
                "type": "object",
                "properties": {
                    "period": {
                        "type": "string",
                        "enum": ["day", "week", "month", "quarter", "year"],
                        "description": "Time period for statistics"
                    },
                    "metric": {
                        "type": "string",
                        "enum": ["detections", "accuracy", "false_positives", "all"],
                        "description": "Specific metric or all metrics",
                        "default": "all"
                    }
                },
                "required": ["period"]
            }
        },
        {
            "name": "export_fraud_report",
            "description": "Export fraud analysis report in specified format",
            "input_schema": {
                "type": "object",
                "properties": {
                    "report_id": {
                        "type": "string",
                        "description": "Report ID to export"
                    },
                    "format": {
                        "type": "string",
                        "enum": ["pdf", "csv", "json", "xlsx"],
                        "description": "Export format",
                        "default": "pdf"
                    }
                },
                "required": ["report_id"]
            }
        }
    ],
    "cvplus": [
        {
            "name": "get_user_statistics",
            "description": "Get CV Plus user statistics and activity metrics",
            "input_schema": {
                "type": "object",
                "properties": {
                    "start_date": {
                        "type": "string",
                        "format": "date",
                        "description": "Start date for statistics"
                    },
                    "end_date": {
                        "type": "string",
                        "format": "date",
                        "description": "End date for statistics"
                    },
                    "metrics": {
                        "type": "array",
                        "items": {
                            "type": "string",
                            "enum": ["registrations", "cv_creations", "downloads", "shares"]
                        },
                        "description": "Specific metrics to retrieve (or all if not specified)"
                    }
                },
                "required": ["start_date", "end_date"]
            }
        },
        {
            "name": "export_cv_data",
            "description": "Export CV data in various formats",
            "input_schema": {
                "type": "object",
                "properties": {
                    "format": {
                        "type": "string",
                        "enum": ["pdf", "csv", "json", "docx"],
                        "description": "Export format",
                        "default": "pdf"
                    },
                    "filters": {
                        "type": "object",
                        "description": "Optional filters (date range, user segment, etc.)"
                    }
                },
                "required": ["format"]
            }
        }
    ]
}


def get_platform_tools(platform: str) -> List[Dict]:
    """
    Get tools available for specific platform.

    Args:
        platform: Platform name ("bayit", "fraud", "cvplus")

    Returns:
        List of tool definitions for the platform
    """
    return PLATFORM_TOOLS.get(platform, [])


def get_all_tools(platform: str) -> List[Dict]:
    """
    Get all tools available for platform (base + platform-specific).

    Args:
        platform: Platform name ("bayit", "fraud", "cvplus")

    Returns:
        Combined list of base and platform-specific tools
    """
    return CLI_TOOLS + get_platform_tools(platform)
