#!/usr/bin/env python3
"""
Index Avatar Knowledge Base

Indexes all avatar-related documentation into the vector database
for semantic search by the voice assistant.

Usage:
    poetry run python scripts/index_avatar_knowledge.py
"""

import asyncio
import logging
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.core.database import init_db
from app.services.olorin.search.docs_indexer import index_custom_knowledge

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Avatar knowledge base - comprehensive documentation for semantic search
AVATAR_KNOWLEDGE = [
    # Gesture Types
    {
        "id": "avatar_gestures_overview",
        "title": "Avatar Gesture Types Overview",
        "category": "avatar",
        "keywords": ["gesture", "animation", "wizard", "olorin", "avatar", "movement"],
        "content": """
The Bayit+ Avatar (Olorin the Wizard) supports 26 gesture types for expressive communication:

CORE GESTURES:
- idle: Default resting state, wizard standing calmly
- greeting: Welcoming wave, used when user first activates
- farewell: Goodbye wave, used when ending session
- listening: Ear cupping, attentive posture for when processing speech
- attentive: Focused look, engaged with user
- thinking: Chin stroking, processing information
- speaking: Animated talking gesture

EMOTIONAL GESTURES:
- cheering: Arms raised in celebration
- clapping: Applause for achievements
- crying: Sad expression with tears
- confused: Scratching head, puzzled look
- shrugging: Shoulders raised, uncertainty

ACTION GESTURES:
- conjuring: Magic spell casting with staff
- presenting: Hands open, showing content
- browsing: Reading/scrolling gesture
- reading: Book reading posture
- emphatic: Strong pointing for emphasis

RESPONSE GESTURES:
- confirmation: Thumbs up approval
- agreement: Nodding yes
- disagreement: Shaking head no
- warning: Stop hand signal
- success: Aha! moment with finger snap
- single_result: Pointing to one item
- magical_reveal: Staff swirl with magical flourish
- clarification: Leaning forward, cupping ear
- waiting: Patient standing pose
- facepalm: Face palm for frustration
""",
    },
    {
        "id": "avatar_dialogue_categories",
        "title": "Avatar Dialogue Categories",
        "category": "avatar",
        "keywords": ["dialogue", "speech", "response", "category", "wizard", "conversation"],
        "content": """
The Avatar has dialogue responses organized into these categories:

GREETING DIALOGUES:
- welcome: Initial welcome messages
- returnGreeting: Messages for returning users
- timeBasedGreeting: Good morning/afternoon/evening

SEARCH & RESULTS:
- searchStart: Starting a search
- searchComplete: Search finished
- noResults: Nothing found
- singleResult: Exactly one match
- multipleResults: Several matches found
- tooManyResults: Need to narrow search

CONTENT ACTIONS:
- playbackStart: Starting playback
- playbackPause: Pausing content
- playbackResume: Resuming playback
- volumeChange: Adjusting volume
- channelChange: Switching channels

ERROR HANDLING:
- errorGeneric: General error message
- errorNetwork: Network connectivity issues
- errorPermission: Access denied
- errorNotFound: Content not available

CLARIFICATION:
- clarificationNeeded: Need more information
- didYouMean: Suggesting alternatives
- pleaseRepeat: Asking to repeat

FAREWELL:
- goodbye: Ending conversation
- sessionTimeout: Session ending due to inactivity

EMOTIONAL:
- encouragement: Positive reinforcement
- celebration: Achievement unlocked
- sympathy: Understanding frustration
""",
    },
    {
        "id": "avatar_states_transitions",
        "title": "Avatar States and Transitions",
        "category": "avatar",
        "keywords": ["state", "transition", "dormant", "listening", "speaking", "mode"],
        "content": """
The Avatar operates in these core states:

CORE STATES:
1. dormant: Avatar is hidden/minimized, waiting for wake word
2. waking: Transitioning from dormant to active (animation plays)
3. listening: Actively listening to user speech (ear cupping gesture)
4. processing: Converting speech and thinking (thinking gesture)
5. speaking: Delivering TTS response (speaking gesture)
6. acting: Performing an action like search or playback
7. idle_active: Active but waiting for next input
8. error: Error state with recovery options
9. retiring: Transitioning back to dormant

STATE TRANSITIONS:
- dormant -> waking: Wake word detected ("Hey Olorin")
- waking -> listening: Wake animation complete
- listening -> processing: Speech-to-text complete
- processing -> speaking: Response ready
- speaking -> acting: Action required (search, play, etc.)
- speaking -> idle_active: No action needed
- idle_active -> listening: User speaks again
- idle_active -> retiring: Timeout (no input)
- retiring -> dormant: Retire animation complete
- any -> error: Error occurred
- error -> idle_active: Error acknowledged

VISUAL FORMS:
- hat: Only wizard hat visible (dormant compact)
- mini: Small floating wizard (background presence)
- partial: Half-body wizard (conversation mode)
- full: Full wizard with staff (active engagement)
""",
    },
    {
        "id": "avatar_voice_commands",
        "title": "Voice Commands the Avatar Understands",
        "category": "avatar",
        "keywords": ["voice", "command", "speech", "wake", "control", "search"],
        "content": """
The Avatar responds to these voice command patterns:

WAKE WORDS:
- "Hey Olorin" - Primary wake word
- "Olorin" - Short wake word
- "שלום אולורין" - Hebrew wake word

CONTENT SEARCH:
- "Find movies about [topic]"
- "Search for [title]"
- "Do you have [content]?"
- "Show me [genre] movies"
- "What movies have [actor]?"

PLAYBACK CONTROL:
- "Play [title]"
- "Pause" / "Stop"
- "Resume"
- "Skip forward/back"
- "Next episode"
- "Volume up/down"

CHANNEL COMMANDS:
- "Show channel [number]"
- "Switch to [channel name]"
- "What's on [channel]?"

INFORMATION:
- "What is this?"
- "Who directed this?"
- "How long is it?"
- "Show me similar content"

SYSTEM:
- "Help"
- "Cancel"
- "Go back"
- "Goodbye" / "See you later"
""",
    },
    {
        "id": "avatar_idle_behaviors",
        "title": "Avatar Idle Behaviors",
        "category": "avatar",
        "keywords": ["idle", "behavior", "animation", "ambient", "waiting"],
        "content": """
When idle, the Avatar performs subtle ambient animations:

IDLE BEHAVIORS:
1. shifts_weight: Wizard shifts weight between feet (3 frames)
2. adjusts_hat: Adjusts wizard hat (4 frames)
3. looks_around: Glances around the screen (5 frames)
4. strokes_beard: Thoughtfully strokes beard
5. sighs_patiently: Patient sigh while waiting
6. puffs_in: Staff orb glows brighter (5 frames)
7. puffs_out: Staff orb dims (5 frames)

TIMING:
- Idle behaviors trigger randomly every 5-15 seconds
- Probability-weighted selection
- Never interrupt active states (speaking, listening)
- Smooth transitions between behaviors

PURPOSE:
- Keep avatar feeling alive and present
- Visual feedback that system is active
- Reduce perceived wait times
- Add personality and charm
""",
    },
    {
        "id": "avatar_interruption_handling",
        "title": "How Avatar Handles Interruptions",
        "category": "avatar",
        "keywords": ["interrupt", "cancel", "stop", "override", "priority"],
        "content": """
The Avatar handles user interruptions gracefully:

INTERRUPTION TYPES:
1. CANCEL: User says "cancel", "stop", "never mind"
   - Immediately stops current action
   - Returns to idle state
   - Plays acknowledgment dialogue

2. REDIRECT: User gives new command while speaking
   - Queues new command
   - Completes current speech or cuts short
   - Processes new command

3. CLARIFICATION: User asks for clarification
   - Pauses current action
   - Addresses clarification
   - Resumes or restarts based on response

4. EMERGENCY: System-level interrupt (error, network)
   - Freezes current state
   - Shows error state
   - Offers recovery options

INTERRUPT PRIORITY:
- EMERGENCY > CANCEL > REDIRECT > CLARIFICATION

CONTENT FREEZE:
When interrupted during search results:
- Results are preserved
- User can return to frozen results
- Timeout clears frozen content after 60 seconds
""",
    },
    {
        "id": "avatar_spritesheet_config",
        "title": "Avatar Animation Spritesheet Configuration",
        "category": "avatar",
        "keywords": ["spritesheet", "animation", "frames", "timing", "config"],
        "content": """
Technical configuration for avatar animations:

SPRITESHEET SPECS:
- Format: PNG with transparency
- Frame layout: Horizontal strip
- Static images: 256x256 pixels
- Full body spritesheets: Variable width x 1344 height

FRAME COUNTS BY GESTURE:
- 6 frames: agreement, attentive, clarification, disagreement, listening,
           magical_reveal, single_result, smacking, success, waiting, warning
- 5 frames: browsing
- 4 frames: clapping, conjuring, crying, farewell, greeting, reading,
           speaking, thinking
- 3 frames: cheering, confused, emphatic, shrugging
- 2 frames: confirmation, presenting

TIMING (milliseconds per frame):
- Fast: 100-120ms (clapping, speaking, cheering)
- Medium: 150ms (most gestures)
- Slow: 180-250ms (thinking, waiting, reading)

LOOPING:
- Looping: browsing, cheering, clapping, confused, conjuring, crying,
          emphatic, listening, presenting, reading, speaking, thinking,
          waiting, attentive
- Non-looping: confirmation, farewell, greeting, shrugging, success,
              clarification, warning, magical_reveal, agreement, disagreement
""",
    },
    {
        "id": "avatar_tvos_focus",
        "title": "Avatar tvOS Focus Navigation",
        "category": "avatar",
        "keywords": ["tvos", "apple tv", "focus", "remote", "siri", "navigation"],
        "content": """
Avatar focus handling for Apple TV (tvOS):

FOCUS BEHAVIOR:
- Avatar container is focusable when visible
- Focus ring appears around avatar
- Scale animation on focus (1.05x)

SIRI REMOTE CONTROLS:
- Select (click): Toggle listening mode
- Play/Pause: Control content playback
- Menu: Exit avatar / go back
- Swipe Up: Expand avatar mode
- Swipe Down: Minimize avatar

FOCUS EVENTS:
- onFocus: Avatar scales up, subtle glow
- onBlur: Avatar returns to normal scale
- onPress: Activates listening mode

ACCESSIBILITY:
- VoiceOver announces avatar state
- Focus trap prevention
- Haptic feedback on state changes
""",
    },
]


async def main():
    """Index all avatar knowledge."""
    logger.info("Initializing database connection...")
    await init_db()

    logger.info(f"Indexing {len(AVATAR_KNOWLEDGE)} avatar knowledge articles...")

    success_count = 0
    failed_count = 0

    for item in AVATAR_KNOWLEDGE:
        logger.info(f"Indexing: {item['title']}")

        result = await index_custom_knowledge(
            knowledge_id=item["id"],
            title=item["title"],
            content=item["content"],
            category=item["category"],
            keywords=item["keywords"],
            language="en",
        )

        if result.get("status") == "completed":
            success_count += 1
            logger.info(f"  ✓ Indexed successfully")
        else:
            failed_count += 1
            logger.error(f"  ✗ Failed: {result.get('error')}")

    logger.info(f"\nIndexing complete: {success_count} succeeded, {failed_count} failed")


if __name__ == "__main__":
    asyncio.run(main())
