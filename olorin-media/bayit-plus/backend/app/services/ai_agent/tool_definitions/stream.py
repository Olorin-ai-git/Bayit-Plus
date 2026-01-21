"""Stream validation tool definitions."""

STREAM_TOOLS = [
    {
        "name": "check_stream_url",
        "description": "Validate that a streaming URL is accessible and working. Returns status, response time, and any errors.",
        "input_schema": {
            "type": "object",
            "properties": {
                "url": {
                    "type": "string",
                    "description": "The streaming URL to validate",
                },
                "stream_type": {
                    "type": "string",
                    "description": "Type of stream: 'hls', 'dash', or 'audio'",
                    "enum": ["hls", "dash", "audio"],
                    "default": "hls",
                },
            },
            "required": ["url"],
        },
    },
]
