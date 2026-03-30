"""Domain config: Olorin.ai platform fields and ElevenLabs voice IDs for dubbing."""


class OlorinCompatConfigMixin:
    """Olorin.ai dubbing voice configuration extracted from the Settings god class.

    NOTE: The ``olorin: OlorinSettings`` nested field and all backward-compatible
    ``@property`` methods that delegate to ``self.olorin.*`` remain in the main
    Settings class because they reference ``self``.
    """

    # ElevenLabs Voice IDs for Dubbing (JSON array of voice configs)
    # Format: '[{"id":"voice_id","name":"Name","lang":"multilingual","desc":"Description"}]'
    ELEVENLABS_DUBBING_VOICES: str = (
        '[{"id":"21m00Tcm4TlvDq8ikWAM","name":"Adam","lang":"multilingual","desc":"Deep male voice"},'
        '{"id":"AZnzlk1XvdvUeBnXmlld","name":"Domi","lang":"multilingual","desc":"Youthful female voice"},'
        '{"id":"MF3mGyEYCl7XYWbV9V6O","name":"Elli","lang":"multilingual","desc":"Warm female voice"},'
        '{"id":"TxGEqnHWrfWFTfGW9XjX","name":"Josh","lang":"multilingual","desc":"Conversational male voice"}]'
    )
