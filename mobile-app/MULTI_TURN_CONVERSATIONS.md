# Multi-Turn Conversations Guide

Multi-turn conversations allow users to have natural, contextual dialogues with the voice system where follow-up commands reference previous interactions.

## Overview

The conversation context system tracks:
- **Current route/screen** - Where the user is in the app
- **Visible content** - What content items are displayed on screen
- **Last mentioned content** - Content referenced in recent commands
- **Command history** - Previous voice commands
- **Search queries** - Last search terms used

This enables natural follow-up commands like:
- "Play that" → Plays the last mentioned or first visible content
- "Show more like this" → Finds similar content to last search
- "Continue watching" → Resumes last viewed content

## Basic Usage

### 1. Import the Hook

```typescript
import { useConversationContextMobile } from './src/hooks';
```

### 2. Use in Your Screen Component

```typescript
function HomeScreen() {
  const conversationContext = useConversationContextMobile();
  const [featuredContent, setFeaturedContent] = useState([]);

  // Register visible content when it loads
  useEffect(() => {
    if (featuredContent.length > 0) {
      const contentIds = featuredContent.map((item) => item.id);
      conversationContext.registerVisibleContent(contentIds);
    }
  }, [featuredContent]);

  return (
    <ScrollView>
      {featuredContent.map((content) => (
        <ContentCard
          key={content.id}
          content={content}
          onPlay={() => {
            // Mention content when user interacts with it
            conversationContext.mentionContent(content.id);
            // ... play content
          }}
        />
      ))}
    </ScrollView>
  );
}
```

## Example Conversation Flows

### Example 1: Contextual Playback

**User sees Channel 13 News card on screen**

```
User: "Play that"
App: (Detects first visible content: "channel_13")
App: "Playing Channel 13 News"
→ Opens player with Channel 13

User: "Make it louder"
App: (Contextual reference to active player)
App: "Volume increased"
→ Adjusts player volume

User: "Add to favorites"
App: (References Channel 13 from context)
App: "Added Channel 13 to your favorites"
→ Adds to favorites list
```

### Example 2: Search Refinement

```
User: "Find comedy shows"
App: "I found 12 comedy shows"
→ Navigates to search results
→ conversationContext.recordSearchQuery("comedy shows")

User: "Show the top 3"
App: (References last search: "comedy shows")
App: "Here are the top 3 comedy shows"
→ Filters search results

User: "Play the first one"
App: (References first visible from filtered results)
App: "Playing [show name]"
→ Opens player
```

### Example 3: Repeat Commands

```
User: "Play Channel 13"
App: "Playing Channel 13"
→ conversationContext.mentionContent("channel_13")

[Some time later...]

User: "Play it again"
App: (Resolves "it" to last mentioned: "channel_13")
App: "Playing Channel 13 again"
→ Restarts Channel 13
```

### Example 4: Multi-Step Navigation

```
User: "Show podcasts"
App: "Here are your podcasts"
→ Navigates to PodcastsScreen
→ conversationContext tracks route change

User: "Play the history podcast"
App: (Contextual to PodcastsScreen, finds matching podcast)
App: "Playing History of One Day podcast"
→ conversationContext.mentionContent("echad_beyom_podcast")

User: "Show similar podcasts"
App: (References "echad_beyom_podcast" from context)
App: "Here are similar history podcasts"
→ Filters by genre/topic
```

## Integration with Voice Commands

The conversation context is automatically integrated with `voiceCommandProcessor`:

```typescript
// In useVoiceMobile hook
const processCommand = async (transcription: string) => {
  // Conversation context is already passed to processor
  const result = await voiceCommandProcessor.processCommand(transcription, {
    navigation,
    widgetStore,
    language,
    // voiceCommandProcessor.context is automatically used
  });

  // Track this command in history
  // (Already tracked in useVoiceMobile via commandHistoryRef)
};
```

## Screen-Level Integration

### HomeScreen Example

```typescript
import { useConversationContextMobile } from './src/hooks';

function HomeScreen() {
  const conversationContext = useConversationContextMobile();
  const [featuredContent, setFeaturedContent] = useState([]);

  // Load featured content from API
  useEffect(() => {
    const loadContent = async () => {
      const content = await api.getFeaturedContent();
      setFeaturedContent(content);

      // Register visible content for voice commands
      conversationContext.registerVisibleContent(
        content.map((item) => item.id)
      );
    };

    loadContent();
  }, []);

  const handlePlayContent = (contentId: string) => {
    // Mention content when played
    conversationContext.mentionContent(contentId);

    // Navigate to player
    navigation.navigate('Player', { id: contentId });
  };

  return (
    <ScrollView>
      <Text>Featured Content</Text>
      {featuredContent.map((content) => (
        <ContentCard
          key={content.id}
          content={content}
          onPlay={() => handlePlayContent(content.id)}
        />
      ))}
    </ScrollView>
  );
}
```

### SearchScreen Example

```typescript
import { useConversationContextMobile } from './src/hooks';

function SearchScreen() {
  const conversationContext = useConversationContextMobile();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);

  const handleSearch = async (searchQuery: string) => {
    setQuery(searchQuery);

    // Record search query for contextual follow-ups
    conversationContext.recordSearchQuery(searchQuery);

    // Perform search
    const searchResults = await api.search(searchQuery);
    setResults(searchResults);

    // Register visible results
    conversationContext.registerVisibleContent(
      searchResults.map((item) => item.id)
    );
  };

  // Voice command integration
  useEffect(() => {
    // Listen for voice search commands
    // "Find comedy", "Search for news", etc.
    // These automatically call handleSearch() via voiceCommandProcessor
  }, []);

  return (
    <View>
      <SearchBar
        value={query}
        onSearch={handleSearch}
      />
      {results.map((result) => (
        <ResultCard
          key={result.id}
          result={result}
          onSelect={() => {
            conversationContext.mentionContent(result.id);
            // ... navigate to content
          }}
        />
      ))}
    </View>
  );
}
```

### PlayerScreen Example

```typescript
import { useConversationContextMobile } from './src/hooks';

function PlayerScreen({ route }) {
  const { contentId } = route.params;
  const conversationContext = useConversationContextMobile();

  useEffect(() => {
    // Mention content when player opens
    conversationContext.mentionContent(contentId);
  }, [contentId]);

  const handleAddToWatchlist = () => {
    // Content ID is still in context
    // Voice command "Add to watchlist" will reference this
    // ... add to watchlist
  };

  const handleAddToFavorites = () => {
    // ... add to favorites
  };

  return (
    <VideoPlayer
      contentId={contentId}
      // Voice commands work contextually:
      // "Pause" → Pauses current player
      // "Volume up" → Adjusts current player
      // "Add to favorites" → Adds current content
    />
  );
}
```

## Advanced: Contextual Reference Resolution

The `resolveContextualReference()` method helps voice commands understand ambiguous references:

```typescript
const conversationContext = useConversationContextMobile();

// User says: "Play that"
const reference = conversationContext.resolveContextualReference();

if (reference.contentId) {
  // Found specific content to play
  playContent(reference.contentId);
} else if (reference.context === 'search_results') {
  // No specific content, but we have search results
  // Play first search result
  playContent(results[0].id);
} else {
  // No context available
  speak("I'm not sure what to play. Can you be more specific?");
}
```

## Best Practices

### 1. Always Register Visible Content

When your screen displays a list of content, always register it:

```typescript
useEffect(() => {
  if (contentList.length > 0) {
    conversationContext.registerVisibleContent(
      contentList.map((item) => item.id)
    );
  }
}, [contentList]);
```

### 2. Mention Content on User Interaction

When user taps or plays content, mention it in conversation:

```typescript
const handlePlayContent = (contentId: string) => {
  conversationContext.mentionContent(contentId);
  // ... play content
};
```

### 3. Track Search Queries

When user searches, record the query:

```typescript
const handleSearch = (query: string) => {
  conversationContext.recordSearchQuery(query);
  // ... perform search
};
```

### 4. Clear Context on Major Navigation Changes

When user navigates to a completely different section:

```typescript
useEffect(() => {
  // Clear context when entering settings or profile
  if (route.name === 'Settings' || route.name === 'Profile') {
    conversationContext.clear();
  }
}, [route.name]);
```

### 5. Use Context for Ambiguous Commands

Let voiceCommandProcessor handle contextual references:

```typescript
// These commands work automatically with context:
// "Play that" → Resolves to last mentioned or first visible
// "Show more" → Finds more based on last search
// "Add to favorites" → Adds last mentioned content
```

## Debugging Conversation Context

Enable debug logging to see context updates:

```typescript
const conversationContext = useConversationContextMobile();

useEffect(() => {
  console.log('[ConversationContext] State:', {
    currentRoute: conversationContext.currentRoute,
    visibleContentCount: conversationContext.visibleContentIds.length,
    lastMentionedCount: conversationContext.lastMentionedContentIds.length,
    commandHistoryCount: conversationContext.commandHistory.length,
    lastSearchQuery: conversationContext.lastSearchQuery,
  });
}, [
  conversationContext.currentRoute,
  conversationContext.visibleContentIds,
  conversationContext.lastMentionedContentIds,
  conversationContext.commandHistory,
  conversationContext.lastSearchQuery,
]);
```

## Testing Multi-Turn Conversations

### Test Scenario 1: Contextual Playback

1. Open HomeScreen (featured content visible)
2. Say: "Play that" → Should play first visible content
3. Say: "Make it louder" → Should adjust player volume
4. Say: "Add to favorites" → Should add current content to favorites

### Test Scenario 2: Search Refinement

1. Say: "Find comedy shows"
2. App shows search results
3. Say: "Show the top 3" → Should filter results
4. Say: "Play the first one" → Should play first result

### Test Scenario 3: Multi-Step Navigation

1. Say: "Show podcasts"
2. App navigates to PodcastsScreen
3. Say: "Play the history podcast"
4. App plays matching podcast
5. Say: "Show similar" → Should show similar podcasts

## Implementation Checklist

For each screen that should support multi-turn conversations:

- [ ] Import `useConversationContextMobile` hook
- [ ] Register visible content when it loads
- [ ] Mention content on user interactions (play, select, etc.)
- [ ] Record search queries when user searches
- [ ] Clear context on major navigation changes (optional)
- [ ] Test contextual voice commands ("play that", "show more", etc.)

## Summary

Multi-turn conversation support enables natural, contextual voice interactions where users can:
- Reference visible content without naming it ("play that")
- Continue previous searches ("show more like this")
- Build on previous commands ("add to favorites" after playing)

The system automatically tracks context through `useConversationContextMobile` and integrates with `voiceCommandProcessor` for seamless voice command interpretation.
