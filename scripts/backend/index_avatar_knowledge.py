#!/usr/bin/env python3
"""
Index Avatar Knowledge Base

Indexes all avatar-related documentation into the vector database
for semantic search by the voice assistant.

Usage:
    cd backend
    poetry run python scripts/index_avatar_knowledge.py
"""

import sys
from pathlib import Path

# CRITICAL: Clean sys.path BEFORE any other imports to avoid module conflicts
# Remove ALL paths containing /scripts/ to prevent the scripts/backend/olorin
# package from shadowing the actual olorin package
sys.path = [p for p in sys.path if "/scripts/" not in p]

# Add backend to path at the front
backend_path = str(Path(__file__).parent.parent)
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

# Now safe to import other modules
import asyncio
import logging
import os

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
    # Beta 500 Program Knowledge (Customer-Facing)
    {
        "id": "beta_500_overview",
        "title": "Beta 500 Program Overview",
        "category": "beta-program",
        "keywords": ["beta", "500", "program", "credits", "ai", "features", "testing", "closed beta"],
        "content": """
Beta 500 is Bayit+'s closed beta program for AI-powered features.

PROGRAM DETAILS:
- Limited to 500 users worldwide
- Each user receives 5,000 AI credits
- Program duration: 90 days from enrollment
- Available on: Web, iOS, Android, tvOS (Apple TV)
- AI Providers: Anthropic Claude, OpenAI, ElevenLabs

WHAT YOU'RE TESTING:
1. AI Search - Natural language content discovery
2. AI Recommendations - Personalized content suggestions
3. Live Dubbing - Real-time audio translation
4. Auto Catch-Up - AI-generated summaries of missed content

HOW TO JOIN:
1. Receive beta invitation email from beta@bayitplus.com
2. Click the invitation link
3. Sign up or log in with Google OAuth
4. Your account is automatically enrolled with 5,000 credits
5. Start using AI features immediately

VERIFY BETA STATUS:
- Web: Settings > Beta Program
- Mobile: Profile > Settings > Beta Program
- tvOS: Settings > Account > Beta Program Status
""",
    },
    {
        "id": "beta_500_credit_system",
        "title": "Beta 500 Credit System",
        "category": "beta-program",
        "keywords": ["credits", "cost", "balance", "threshold", "usage", "depleted"],
        "content": """
Credits are your AI currency in the Beta 500 program.

CREDIT COSTS BY FEATURE:
- AI Search: 10 credits per search query
- AI Recommendations: 5 credits per recommendation request
- Live Dubbing: 1 credit per second (60 credits per minute)
- Auto Catch-Up: 15 credits per summary

BALANCE THRESHOLDS:
- Healthy (Green): More than 500 credits
- Low (Yellow): 100-500 credits remaining
- Critical (Red): Less than 100 credits
- Depleted (Gray): 0 credits - AI features disabled

WHEN CREDITS ARE DEPLETED:
- AI features show "Insufficient Credits" message
- AI Search falls back to regular keyword search
- AI Recommendations switch to algorithmic suggestions
- Live Dubbing becomes unavailable
- Auto Catch-Up becomes unavailable
- All non-AI features continue working normally

IMPORTANT FOR LIVE DUBBING:
- 30 minutes of dubbing = 1,800 credits (36% of allocation)
- Use strategically for important content
""",
    },
    {
        "id": "beta_500_acquiring_credits",
        "title": "How to Get More Beta 500 Credits",
        "category": "beta-program",
        "keywords": ["credits", "bonus", "milestone", "referral", "more", "get", "earn"],
        "content": """
Ways to earn more credits in the Beta 500 program:

FEEDBACK BONUSES:
- Complete feedback survey: +100 credits
- Report confirmed bug: +50 credits
- Submit feature suggestion: +25 credits

TESTING MILESTONES:
- First 100 AI searches: +200 credits
- First 50 recommendations: +100 credits
- First 30 minutes dubbing: +300 credits
- First 10 catch-ups: +150 credits

REFERRAL PROGRAM:
- Refer another beta user: +500 credits (upon their activation)
- Limited to 3 referrals maximum

EMERGENCY CREDIT REQUEST:
If you've depleted credits but have critical testing:
1. Email beta@bayitplus.com
2. Subject: "Beta 500 Credit Request - [Your Email]"
3. Include: Current balance, testing completed, specific testing needs
4. Requests reviewed within 24-48 hours
5. Emergency grants: Up to 1,000 credits (one-time)

FUTURE OPTIONS (Coming Q2 2026):
- Credit packs for purchase
- Subscription credit allowances
""",
    },
    {
        "id": "beta_500_ai_features",
        "title": "Beta 500 AI Features Guide",
        "category": "beta-program",
        "keywords": ["ai", "search", "recommendations", "dubbing", "catch-up", "features"],
        "content": """
AI features available in Beta 500:

AI SEARCH (10 credits/search):
- Use natural language instead of keywords
- Toggle "AI Search" in search bar
- Example queries:
  - "Something relaxing to watch before bed"
  - "Family movies for Shabbat evening"
  - "Shows like Shtisel but lighter"
  - "Israeli comedy movies from 2020-2025"

AI RECOMMENDATIONS (5 credits/request):
- Find "AI Picks for You" on Home screen
- Personalized based on: viewing history, time of day, cultural events
- Context modes: Morning, Afternoon, Evening, Late Night, Weekend, Holiday

LIVE DUBBING (1 credit/second):
- Real-time audio translation for live TV
- Languages: Hebrew to English, Spanish, French, Russian, Arabic
- Click dubbing icon during live TV playback
- Maximum session: 1 hour (auto-ends)
- Pausing stops credit consumption

AUTO CATCH-UP (15 credits/summary):
- AI summaries of live TV content you missed
- Click "Catch Me Up" on any live channel
- Options: Brief (2-3 sentences) or Detailed (full summary)
- Best for: News, sports, live debates

FEATURES NOT YET AVAILABLE:
- VOD Dubbing (Coming Q2 2026)
- AI Subtitles
- Voice Commands
- AI Chat Assistant
""",
    },
    {
        "id": "beta_500_troubleshooting",
        "title": "Beta 500 Troubleshooting",
        "category": "beta-program",
        "keywords": ["error", "problem", "issue", "fix", "troubleshoot", "help"],
        "content": """
Common Beta 500 issues and solutions:

INSUFFICIENT CREDITS ERROR:
- Check balance in Settings > Beta Program
- Verify you have enough credits for the action
- Use non-AI alternatives as fallback

AI SEARCH RETURNS NO RESULTS:
- Rephrase query with more specifics
- Try different language
- Check for typos
- Use fewer filters

LIVE DUBBING NOT STARTING:
- Verify credits > 60 (1 minute minimum)
- Check internet connection
- Try refreshing the stream
- Ensure channel supports dubbing

RECOMMENDATIONS NOT PERSONALIZED:
- Build more viewing history
- Update preferences in Settings
- Use feedback (thumbs up/down)

CATCH-UP "NO CONTENT AVAILABLE":
- Content needs > 5 minutes of history
- Verify channel is live
- Some channels may not support catch-up

ERROR CODES:
- BETA_001: Insufficient credits
- BETA_002: Not enrolled in beta
- BETA_003: Beta expired
- AI_001: AI service unavailable (retry later)
- AI_002: Query too long
- DUB_001: Dubbing unavailable for this channel

SUPPORT:
- Email: beta@bayitplus.com (24-48 hour response)
- Status: status.bayitplus.com
- Community: community.bayitplus.com/beta500
""",
    },
    {
        "id": "beta_500_faq",
        "title": "Beta 500 Frequently Asked Questions",
        "category": "beta-program",
        "keywords": ["faq", "question", "answer", "help", "how", "why", "what"],
        "content": """
Frequently asked questions about Beta 500:

Q: Why is it called "Beta 500"?
A: Limited to 500 users, each receiving 5,000 credits.

Q: Can I get more than 5,000 credits?
A: Yes, through feedback bonuses, milestones, and referrals.

Q: Do unused credits roll over?
A: Credits don't expire during the 90-day beta period.

Q: Can I share my account with family?
A: No, beta accounts are individual. Family sharing planned for public launch.

Q: What happens when Beta 500 ends?
A: AI features transition to subscription/pay-per-use. Beta participants receive priority access and special pricing.

Q: Is AI dubbing available for all content?
A: Currently only Live TV. VOD dubbing coming Q2 2026.

Q: Can I use AI features offline?
A: No, AI features require internet connection.

Q: Are AI features available in all countries?
A: Yes, but some content may have regional restrictions.

Q: How accurate is AI Search?
A: ~85-90% relevance accuracy. Results improve with specific queries.

Q: Why is Live Dubbing so expensive in credits?
A: Real-time AI translation is computationally intensive.

Q: What platforms support Beta 500?
A: Web, iOS, Android, and tvOS (Apple TV).

Q: How do I report a bug?
A: Settings > Beta Program > Send Feedback, or email beta@bayitplus.com
""",
    },
]


async def main():
    """Index all avatar knowledge."""
    # Import here to avoid circular import issues
    from app.core.database import connect_to_mongo
    from app.services.olorin.search.docs_indexer import index_custom_knowledge

    logger.info("Initializing database connection...")
    await connect_to_mongo()

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
