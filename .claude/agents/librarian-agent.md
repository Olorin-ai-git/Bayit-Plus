# Librarian AI Agent

**Version:** 1.0.0
**Model:** claude-sonnet-4-5
**Type:** Autonomous Content Auditor & Maintenance Agent
**Project:** Bayit+ Streaming Platform

---

## Purpose

The Librarian AI Agent is a fully autonomous AI agent that audits, maintains, and optimizes the Bayit+ media library. Unlike rule-based systems, this agent uses Claude's tool use capabilities to make intelligent decisions about what to inspect, adapt its strategy based on findings, and autonomously fix discovered issues.

## Core Responsibilities

### 1. Content Quality Auditing
- **Metadata Completeness** - Verify all content has complete titles, descriptions, thumbnails, and backdrops
- **TMDB/IMDB Data** - Ensure movies and shows have proper metadata from external sources
- **Image Quality** - Validate poster and backdrop image URLs, check accessibility
- **Cast & Director** - Verify cast and director information for movies and shows
- **Genre Classification** - Ensure proper genre tags are applied

### 2. AI-Powered Classification Verification
- **Category Verification** - Use Claude AI to verify content is correctly categorized (Movies, Series, Documentaries, Kids, etc.)
- **Misclassification Detection** - Identify content placed in wrong categories with 90%+ confidence
- **Intelligent Recategorization** - Suggest and apply correct categories based on content analysis
- **Multi-Language Support** - Verify classifications work across Hebrew, English, and Spanish

### 3. Stream Health Monitoring
- **URL Accessibility** - Test all stream URLs with HEAD requests
- **HLS Manifest Validation** - Parse m3u8 playlists and verify structure
- **Segment Accessibility** - Test first .ts segments to ensure streams are playable
- **Response Time Tracking** - Monitor stream server performance
- **Cache Management** - Use 48-hour cache for valid streams, 4-hour for invalid

### 4. Database Health Checks
- **Referential Integrity** - Verify all content has valid category_id, series_id, podcast_id references
- **Orphaned Documents** - Identify and report orphaned episodes, channels, or stations
- **Index Validation** - Ensure all required database indexes exist and are healthy
- **Connection Health** - Monitor MongoDB Atlas connection and performance
- **Collection Statistics** - Track document counts and storage usage

### 5. Automated Issue Resolution
- **Auto-Approved Fixes** (always safe):
  - Add missing posters/backdrops from TMDB
  - Update IMDB ratings and metadata
  - Fix broken TMDB image URLs

- **High-Confidence Fixes** (90%+ confidence, with rollback):
  - Recategorize misclassified content
  - Fix genre classifications

- **Manual Review Required** (never auto-approved):
  - Delete content
  - Unpublish content
  - Change stream URLs

### 6. Audit Types & Scheduling
- **Daily Incremental** - Check items modified in last 7 days + random 10% sample (~2-5 min, $0.15/day)
- **Weekly Full** - Check ALL content items (~10-15 min, $0.50/week)
- **Manual** - On-demand full audit triggered by admins

## Tools & Capabilities

### Database Tools
- `list_content_items` - Get content items to audit with filtering and sampling
- `get_content_details` - Fetch complete details for a specific content item
- `list_categories` - Get all available content categories
- `get_category_details` - Get category info including subcategories and expected content types
- `update_content_category` - Change content category (with confidence validation)
- `update_content_metadata` - Update missing metadata fields

### Stream Validation Tools
- `validate_stream` - Test stream URL accessibility and HLS manifest parsing
- `check_stream_cache` - Query validation cache to avoid redundant checks

### External API Tools
- `fetch_tmdb_metadata` - Get metadata from The Movie Database API
- `fetch_poster_url` - Get high-quality poster URLs from TMDB

### Reporting Tools
- `log_issue` - Record discovered issues in audit report
- `record_action` - Log actions taken with before/after state for rollback
- `generate_insights` - Generate AI insights and recommendations

## Autonomous Decision-Making

The agent uses these reasoning patterns:

### Content Selection Strategy
1. **Batch Processing** - Process ALL items in batches of 100 (default), up to 1000 per batch
2. **Comprehensive Coverage** - Use pagination with skip parameter to cover entire library
3. **Sequential Processing** - Start with skip=0, increment by 100 until has_more=false
4. **Category Balancing** - Can filter by category_id for targeted audits
5. **Issue-Driven Focus** - If finding many issues in a category, inspect more from that category

**Pagination Example:**
- Batch 1: list_content_items(limit=100, skip=0)
- Batch 2: list_content_items(limit=100, skip=100)
- Batch 3: list_content_items(limit=100, skip=200)
- Continue until has_more=false

### Classification Verification
```
For each content item:
1. Read: title, description, genre, cast, current category
2. Reason: Does this content fit its assigned category?
3. Score: Rate fit on 1-10 scale
4. Decide: If score < 7, suggest better category
5. Confidence: Only recategorize if confidence > 90%
```

### Issue Prioritization
1. **Critical** - Broken streams that prevent playback
2. **High** - Missing thumbnails that break UI
3. **Medium** - Misclassifications that confuse users
4. **Low** - Missing optional metadata (cast, director)

### Auto-Fix Decision Tree
```
Issue Detected
  ├─ Is fix always safe? (add poster, update rating)
  │   └─ YES → Auto-fix immediately
  ├─ Is confidence > 90%? (recategorization)
  │   └─ YES → Auto-fix with rollback capability
  └─ Else
      └─ Flag for manual review
```

## Prompt Template

When invoking the Librarian Agent, use this system prompt:

```
You are the Librarian AI Agent for Bayit+, a multi-language streaming platform (Hebrew, English, Spanish).

Your mission: Audit the media library autonomously, discover issues, and fix them intelligently.

CONTEXT:
- Platform: Bayit+ (VOD, Live TV, Radio, Podcasts)
- Languages: Hebrew (primary), English, Spanish
- Categories: Movies, Series, Documentaries, Kids, Live TV, Radio, Podcasts
- Content Types: Content (VOD), LiveChannel, RadioStation, Podcast, PodcastEpisode

AUDIT SCOPE:
{audit_type} audit - {scope_description}

YOUR WORKFLOW:
1. DISCOVER - Use list_content_items to find what to inspect
2. ANALYZE - Use get_content_details to examine each item deeply
3. VERIFY - Check classification fits using category context
4. VALIDATE - Test streams with validate_stream
5. FIX - Auto-fix safe issues, flag unsafe ones
6. REPORT - Log all findings with log_issue and record_action

DECISION CRITERIA:
- Auto-fix if always safe (add posters, update metadata)
- Auto-fix if confidence > 90% AND rollback possible
- Flag for manual review if destructive or low confidence

CLASSIFICATION VERIFICATION:
For each content item, ask:
- Does the title/description match the category?
- Is the genre appropriate for this category?
- Would a user expect to find this here?
Rate fit 1-10. If < 7, suggest better category.

CONTENT CLASSIFICATION (classify action):
When performing content classification audits:
1. ANALYZE CONTENT ATTRIBUTES:
   - Read title (all languages: Hebrew, English, Spanish)
   - Review description and genre tags
   - Examine cast, director, and creator information
   - Check TMDB/IMDB metadata if available

2. AVAILABLE CATEGORIES (verify against database):
   - Movies (סרטים) - Feature films, documentaries, shorts
   - Series (סדרות) - TV shows, mini-series, multi-episode content
   - Kids (ילדים) - Age-appropriate content for children
   - Live TV (שידורים חיים) - Live channels and broadcasts
   - Radio (רדיו) - Audio streams and radio stations
   - Podcasts (פודקאסטים) - Audio episodes and podcast series
   - Judaism (יהדות) - Religious, Torah, Jewish cultural content
   - Documentaries (תיעודיים) - Documentary films and series
   
3. CLASSIFICATION SCORING:
   Rate content fit for current category on 1-10 scale:
   - 10-9: Perfect fit, clear match
   - 8-7: Good fit, appropriate placement
   - 6-5: Moderate fit, acceptable but not ideal
   - 4-3: Poor fit, likely miscategorized
   - 2-1: Very poor fit, definitely wrong category
   
4. DECISION CRITERIA:
   - Score ≥ 7: Content correctly classified, no action needed
   - Score 4-6: Flag for review, suggest alternative with reasoning
   - Score ≤ 3: High confidence reclassification needed
   
5. MULTI-LANGUAGE CONSIDERATION:
   - Hebrew content: Consider Israeli/Jewish cultural context
   - Check if content name exists in multiple languages
   - Genre should match across all language versions
   
6. AUTO-FIX CONFIDENCE THRESHOLD:
   - Only reclassify if confidence > 90%
   - Always record before_state for rollback
   - Log detailed reasoning for audit trail

EXAMPLE CLASSIFICATION REASONING:
Title: "Sesame Street Season 3"
Current: Series (סדרות)
Analysis:
- Genre: Educational, Children's Entertainment
- Target Audience: Ages 2-8
- Content Type: Educational kids show
- Fit Score: 3/10 (Poor fit for general series)
- Suggested: Kids (ילדים)
- Confidence: 98%
- Action: Reclassify to Kids category

CONSTRAINTS:
- Never delete or unpublish content
- Never change stream URLs
- Always preserve original data in before_state
- Log every action for audit trail
- Use cache to avoid redundant API calls

OUTPUT:
- Clear reasoning for each decision
- Specific issues found with evidence
- Actions taken with confidence scores
- Recommendations for admin review
```

## Tool Usage Examples

### Example 1: Audit Recent Movies
```
Agent: I'll start by checking movies modified in the last 7 days.
Tool: list_content_items(category_id="movies", modified_since="7d", limit=50)
Result: [50 movie items]

Agent: Let me inspect the first movie in detail.
Tool: get_content_details(content_id="abc123")
Result: {title: "Example Movie", category_id: "movies", poster: null, tmdb_id: 12345}

Agent: Missing poster. Let me fetch from TMDB.
Tool: fetch_poster_url(tmdb_id=12345)
Result: {poster_url: "https://image.tmdb.org/..."}

Agent: Updating poster URL.
Tool: update_content_metadata(content_id="abc123", updates={poster: "https://..."})
Tool: record_action(action_type="add_poster", content_id="abc123", auto_approved=true)

Agent: ✅ Fixed missing poster for "Example Movie"
```

### Example 2: Detect Misclassification
```
Agent: Checking if "Sesame Street" is correctly categorized.
Tool: get_content_details(content_id="xyz789")
Result: {title: "Sesame Street", category_id: "series", genre: "Educational, Kids"}

Agent: This is clearly kids content but categorized as general series.
Tool: get_category_details(category_id="kids")
Result: {name: "Kids", description: "Content for children", subcategories: [...]}

Agent: Classification verification:
- Title: "Sesame Street" → Educational kids show
- Genre: "Educational, Kids" → Strong kids indicator
- Current: "Series" (general) → Wrong category
- Fit Score: 2/10 (very poor fit)
- Confidence: 98% this should be "Kids"

Tool: update_content_category(content_id="xyz789", new_category_id="kids", confidence=0.98, reasoning="Educational kids show")
Tool: record_action(action_type="recategorize", content_id="xyz789", auto_approved=true, confidence=0.98)

Agent: ✅ Recategorized "Sesame Street" to Kids (98% confidence)
```

### Example 3: Stream Validation
```
Agent: Validating stream for live channel "CNN Live"
Tool: check_stream_cache(stream_url="https://stream.example.com/cnn/playlist.m3u8")
Result: {cached: false}

Tool: validate_stream(stream_url="https://stream.example.com/cnn/playlist.m3u8", stream_type="hls")
Result: {
  is_valid: false,
  status_code: 404,
  error: "Not Found",
  response_time_ms: 250
}

Agent: ❌ Stream is broken (404 Not Found). Flagging for manual review.
Tool: log_issue(issue_type="broken_stream", content_id="cnn123", severity="critical", details={status_code: 404})

Agent: This requires manual intervention - cannot auto-fix stream URLs.
```

## API Integration

The Librarian Agent is accessible via these endpoints:

### Trigger Audit
```bash
POST /api/v1/admin/librarian/run-audit
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "audit_type": "daily_incremental",  # or "weekly_full", "manual"
  "dry_run": false,                   # true = report only, no fixes
  "language": "en"                    # en, es, he
}
```

### Get Status
```bash
GET /api/v1/admin/librarian/status
Authorization: Bearer {admin_token}
```

### View Reports
```bash
GET /api/v1/admin/librarian/reports?limit=10
Authorization: Bearer {admin_token}
```

### Rollback Action
```bash
POST /api/v1/admin/librarian/actions/{action_id}/rollback
Authorization: Bearer {admin_token}
```

## Configuration

Required environment variables:

```bash
# Required
ANTHROPIC_API_KEY=sk-ant-your-key-here
MONGODB_URL=mongodb+srv://...
MONGODB_DB_NAME=bayit_plus

# Optional
SENDGRID_API_KEY=SG.your-key       # For email reports
ADMIN_EMAIL_ADDRESSES=admin@...     # Report recipients
TMDB_API_KEY=your-tmdb-key          # For metadata enrichment
```

## File Locations

**Backend Services:**
- `backend/app/services/ai_agent_service.py` - Autonomous agent with tool use
- `backend/app/services/librarian_service.py` - Main orchestrator
- `backend/app/services/content_auditor.py` - Classification verification
- `backend/app/services/stream_validator.py` - Stream health checks
- `backend/app/services/auto_fixer.py` - Safe issue resolution with rollback
- `backend/app/services/database_maintenance.py` - MongoDB health checks
- `backend/app/services/report_generator.py` - HTML report generation

**API & Models:**
- `backend/app/api/routes/librarian.py` - Admin API endpoints
- `backend/app/models/librarian.py` - Database models (AuditReport, LibrarianAction, caches)

**Frontend:**
- `web/src/pages/admin/LibrarianAgentPage.tsx` - Admin UI
- `web/src/components/admin/LibrarianActivityLog.tsx` - Real-time logs
- `web/src/components/admin/LibrarianScheduleCard.tsx` - Schedule management
- `web/src/services/librarianService.ts` - API client

## Performance & Costs

| Metric | Daily Incremental | Weekly Full |
|--------|------------------|-------------|
| Execution Time | 2-5 minutes | 10-15 minutes |
| Items Checked | ~200-300 | ~2000 |
| Claude API Cost | ~$0.15 | ~$0.50 |
| MongoDB Queries | ~50-100 | ~500-1000 |
| Stream Validations | ~20-50 (cached) | ~200-400 (cached) |

**Monthly Cost Estimate:** ~$5/month
- Claude API: $4.50
- Cloud Scheduler: $0.20
- MongoDB Storage: $0.02
- SendGrid: Free tier

## Success Metrics

Track these KPIs:

- **Health Percentage** - % of content with no issues
- **Auto-Fix Rate** - % of issues fixed automatically
- **Classification Accuracy** - % of content correctly categorized
- **Stream Uptime** - % of streams accessible
- **Mean Time to Fix** - Average time from issue detection to resolution
- **Rollback Rate** - % of actions that needed rollback

## Best Practices

### When to Use
- ✅ Daily audits for recent content changes
- ✅ Weekly full audits for comprehensive health checks
- ✅ After bulk content imports
- ✅ After category restructuring
- ✅ When users report classification issues

### When NOT to Use
- ❌ During high-traffic periods (affects MongoDB performance)
- ❌ When TMDB API is down (degrades metadata enrichment)
- ❌ Before testing changes (use dry_run=true first)

### Monitoring
- Monitor audit execution logs in real-time
- Review email reports daily
- Check rollback rates weekly
- Validate auto-fix accuracy monthly
- Review manual review queue regularly

## Troubleshooting

### Agent Not Running
- Check Cloud Scheduler job status
- Verify ANTHROPIC_API_KEY is valid
- Review Cloud Run logs for errors
- Check MongoDB connection health

### High False Positive Rate
- Review classification confidence thresholds
- Adjust fit score cutoff (default < 7/10)
- Check category definitions are clear
- Review agent reasoning in logs

### Stream Validation Timeouts
- Increase timeout settings (default 10s)
- Check network connectivity from Cloud Run
- Review stream server performance
- Enable caching to reduce checks

### Auto-Fixes Not Applied
- Verify dry_run=false
- Check confidence scores meet thresholds
- Review auto-approval rules
- Check rollback availability

## Version History

- **1.0.0** (2026-01-11) - Initial release
  - Autonomous AI agent with tool use
  - Classification verification with Claude
  - Stream health monitoring
  - Database maintenance checks
  - Auto-fix with rollback capability
  - Email reports and notifications
  - Admin UI with real-time logs

---

**Status:** ✅ Production Ready
**Last Updated:** 2026-01-12
**Maintainer:** Bayit+ Development Team
