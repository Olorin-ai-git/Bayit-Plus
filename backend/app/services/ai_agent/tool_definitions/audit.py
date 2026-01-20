"""Audit completion tool definitions."""

AUDIT_TOOLS = [
    {
        "name": "complete_audit",
        "description": "Call this when you've finished the audit and are ready to provide a final summary. Provide comprehensive breakdown statistics.",
        "input_schema": {
            "type": "object",
            "properties": {
                "summary": {
                    "type": "string",
                    "description": "Overall summary of the audit (2-3 paragraphs)"
                },
                "items_checked": {
                    "type": "integer",
                    "description": "Total number of items inspected"
                },
                "issues_found": {
                    "type": "integer",
                    "description": "Total number of issues discovered"
                },
                "issues_fixed": {
                    "type": "integer",
                    "description": "Total number of issues fixed autonomously"
                },
                "flagged_for_review": {
                    "type": "integer",
                    "description": "Number of items flagged for manual review"
                },
                "recommendations": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "3-5 strategic recommendations for improving the library"
                },
                "subtitle_stats": {
                    "type": "object",
                    "description": "Comprehensive subtitle statistics",
                    "properties": {
                        "items_with_all_required": {"type": "integer"},
                        "items_missing_subtitles": {"type": "integer"},
                        "subtitles_extracted_from_video": {"type": "integer"},
                        "subtitles_downloaded_external": {"type": "integer"},
                        "by_language": {"type": "object", "additionalProperties": {"type": "integer"}},
                        "opensubtitles_quota_used": {"type": "integer"},
                        "opensubtitles_quota_remaining": {"type": "integer"}
                    }
                },
                "metadata_stats": {
                    "type": "object",
                    "description": "Metadata fix statistics",
                    "properties": {
                        "posters_fixed": {"type": "integer"},
                        "metadata_updated": {"type": "integer"},
                        "titles_cleaned": {"type": "integer"},
                        "tmdb_searches_performed": {"type": "integer"}
                    }
                },
                "categorization_stats": {
                    "type": "object",
                    "description": "Categorization statistics",
                    "properties": {
                        "items_recategorized": {"type": "integer"},
                        "avg_confidence": {"type": "number"},
                        "high_confidence_moves": {"type": "integer"},
                        "medium_confidence_moves": {"type": "integer"}
                    }
                },
                "stream_validation_stats": {
                    "type": "object",
                    "description": "Stream URL validation statistics",
                    "properties": {
                        "streams_checked": {"type": "integer"},
                        "streams_healthy": {"type": "integer"},
                        "streams_broken": {"type": "integer"},
                        "avg_response_time_ms": {"type": "number"}
                    }
                },
                "storage_stats": {
                    "type": "object",
                    "description": "Storage statistics (if checked)",
                    "properties": {
                        "total_size_gb": {"type": "number"},
                        "file_count": {"type": "integer"},
                        "estimated_monthly_cost_usd": {"type": "number"},
                        "large_files_found": {"type": "integer"}
                    }
                },
                "podcast_stats": {
                    "type": "object",
                    "description": "Podcast management statistics",
                    "properties": {
                        "podcasts_synced": {"type": "integer"},
                        "episodes_added": {"type": "integer"},
                        "episodes_removed": {"type": "integer"}
                    }
                },
                "issue_breakdown": {
                    "type": "object",
                    "description": "Breakdown of issues by type",
                    "properties": {
                        "missing_subtitles": {"type": "integer"},
                        "missing_metadata": {"type": "integer"},
                        "missing_posters": {"type": "integer"},
                        "dirty_titles": {"type": "integer"},
                        "broken_streams": {"type": "integer"},
                        "misclassifications": {"type": "integer"},
                        "quality_issues": {"type": "integer"},
                        "other": {"type": "integer"}
                    }
                },
                "action_breakdown": {
                    "type": "object",
                    "description": "Breakdown of actions taken",
                    "properties": {
                        "subtitle_extractions": {"type": "integer"},
                        "subtitle_downloads": {"type": "integer"},
                        "metadata_updates": {"type": "integer"},
                        "poster_fixes": {"type": "integer"},
                        "title_cleanups": {"type": "integer"},
                        "recategorizations": {"type": "integer"},
                        "stream_validations": {"type": "integer"},
                        "manual_reviews_flagged": {"type": "integer"}
                    }
                },
                "health_score": {
                    "type": "number",
                    "description": "Overall library health score (0-100)"
                }
            },
            "required": ["summary", "items_checked", "issues_found", "issues_fixed"]
        }
    },
]
