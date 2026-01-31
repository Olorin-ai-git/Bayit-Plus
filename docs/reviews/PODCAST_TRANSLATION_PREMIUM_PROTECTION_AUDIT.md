# Podcast Translation Premium Protection Audit

**Date:** 2026-01-24
**Auditor:** Claude Code
**Status:** ⚠️ **CRITICAL GAPS IDENTIFIED**

## Executive Summary

The podcast translation feature **LACKS PREMIUM PROTECTION** on both UI and server levels. Any user can access translated podcast episodes without a premium subscription, which is inconsistent with other premium features and represents a revenue loss.

## Comparison with Other Premium Features

### ✅ CORRECT Implementation Example: Live Dubbing

**Backend Protection:**
```python
# backend/app/api/routes/live_dubbing.py
@router.post("/connect")
async def connect_dubbing(
    current_user: User = Depends(get_current_premium_user)  # ✅ Premium check
):
    """Connect to live dubbing service (Premium Feature)"""
```

**Frontend Protection:**
::: v-pre
```tsx
// shared/components/player/LiveDubbingControls.tsx
export const LiveDubbingControls: React.FC<LiveDubbingControlsProps> = ({
  isPremium,  // ✅ Prop passed in
  onShowUpgrade,
}) => {
  const handlePress = () => {
    if (!isPremium) {  // ✅ UI check
      onShowUpgrade?.()
      return
    }
    onToggle()
  }

  return (
    <GlassButton
      title={isPremium ? 'Live Dubbing' : 'Premium'}  // ✅ Shows premium badge
      variant={isEnabled ? 'primary' : 'ghost'}
    />
  )
}
```
:::

### ✅ CORRECT Implementation Example: LLM Search

**Backend Protection:**
```python
# backend/app/api/routes/search_llm.py
@router.post("/llm")
async def llm_natural_language_search(
    request: LLMSearchRequest,
    current_user: User = Depends(get_current_premium_user)  # ✅ Premium check
):
    """Natural language search using Claude AI (Premium Feature)"""
```

**Frontend Protection:**
::: v-pre
```tsx
// shared/components/search/LLMSearchButton.tsx
export function LLMSearchButton({
  isPremium = false,  // ✅ Prop passed in
}: LLMSearchButtonProps) {
  return (
    <TouchableOpacity>
      {!isPremium && (  // ✅ Shows premium badge
        <View className="px-2 py-1 bg-yellow-500/30 rounded-full">
          <Text className="text-yellow-300 text-xs font-bold">PREMIUM</Text>
        </View>
      )}
    </TouchableOpacity>
  )
}
```
:::

### ✅ CORRECT Implementation Example: Recordings

**Backend Protection:**
```python
# backend/app/api/routes/recordings.py
def get_current_premium_user(
    current_user: User = Depends(get_current_active_user),
) -> User:
    """Dependency to ensure user has premium access"""
    if not current_user.can_access_premium_features():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Premium subscription required for recording feature",
        )
    return current_user

@router.post("/start", response_model=RecordingSessionResponse)
async def start_recording(
    request: StartRecordingRequest,
    current_user: User = Depends(get_current_premium_user),  # ✅ Premium check
):
    """Start manual recording. Requires premium subscription."""
```

## ❌ INCORRECT Implementation: Podcast Translation

### Backend Issues

**File:** `backend/app/api/routes/podcasts.py:384-434`

**Problem:** No premium protection on user-facing endpoint
```python
@router.get("/{show_id}/episodes/{episode_id}")
async def get_episode(show_id: str, episode_id: str, request: Request):
    """Get single episode details with translation data."""
    # ❌ NO PREMIUM CHECK
    # ❌ Returns translated audio URLs without verification

    episode = await PodcastEpisode.get(episode_id)

    # Determine which audio URL to use
    audio_url = episode.audio_url  # Default to original
    if (
        preferred_lang in episode.available_languages
        and preferred_lang != episode.original_language
    ):
        translation = episode.translations.get(preferred_lang)
        if translation:
            audio_url = translation.audio_url  # ❌ Returns translated audio without premium check

    return {
        "audioUrl": audio_url,  # ❌ Translated audio accessible to all users
        "availableLanguages": episode.available_languages,  # ❌ Shows all languages
        "translations": episode.translations,  # ❌ Exposes all translation data
    }
```

**Admin Endpoint:**
```python
# backend/app/api/routes/admin_podcast_episodes.py
@router.post("/podcasts/{podcast_id}/episodes/{episode_id}/translate")
async def trigger_translation(
    current_user: User = Depends(has_permission(Permission.CONTENT_UPDATE)),  # ✅ Admin only
):
    """Manually trigger translation for a specific episode."""
```
**Note:** Admin endpoint correctly requires admin permission, but this is for triggering translations, not accessing them.

### Frontend Issues

**File:** `web/src/components/player/PodcastLanguageSelector.tsx`

**Problem:** No premium check or premium badge
::: v-pre
```tsx
export function PodcastLanguageSelector({
  availableLanguages,  // ❌ Shows all languages without checking premium
  currentLanguage,
  onLanguageChange,
}: PodcastLanguageSelectorProps) {
  // ❌ NO isPremium prop
  // ❌ NO premium check
  // ❌ NO onShowUpgrade handler

  return (
    <View>
      {availableLanguages.map((lang) => {
        return (
          <GlassButton
            key={lang}
            variant={isCurrent ? 'primary' : 'secondary'}
            onPress={() => handleLanguageChange(lang)}  // ❌ No premium check
            title={`${LANGUAGE_FLAGS[lang]} ${t(`podcast.languages.${lang}.short`)}`}
          />
        );
      })}
    </View>
  );
}
```
:::

**Missing Props:**
- ❌ No `isPremium` prop
- ❌ No `onShowUpgrade` handler
- ❌ No premium badge for non-premium users
- ❌ No visual indication that translation is a premium feature

## Required Fixes

### 1. Backend Protection

**File:** `backend/app/api/routes/podcasts.py`

**Add premium check to episode endpoint:**

```python
@router.get("/{show_id}/episodes/{episode_id}")
async def get_episode(
    show_id: str,
    episode_id: str,
    request: Request,
    current_user: Optional[User] = Depends(get_optional_user)  # ✅ ADD: Optional auth
):
    """Get single episode details with translation data (translations require premium)."""
    try:
        episode = await PodcastEpisode.get(episode_id)
        if not episode or episode.podcast_id != show_id:
            raise HTTPException(status_code=404, detail="Episode not found")

        # Get user's preferred language
        accept_language = request.headers.get("Accept-Language", "he")
        preferred_lang = accept_language.split(",")[0].split("-")[0]

        # ✅ ADD: Check premium status
        is_premium = current_user and current_user.can_access_premium_features()

        # Determine which audio URL to use
        audio_url = episode.audio_url  # Default to original

        # ✅ ADD: Only provide translated audio if user has premium
        if (
            is_premium and  # ✅ Premium check
            preferred_lang in episode.available_languages
            and preferred_lang != episode.original_language
        ):
            translation = episode.translations.get(preferred_lang)
            if translation:
                audio_url = translation.audio_url

        # ✅ ADD: Filter translation data based on premium status
        exposed_translations = {}
        if is_premium:
            exposed_translations = {
                lang: {
                    "audioUrl": trans.audio_url,
                    "transcript": trans.transcript,
                    "translatedText": trans.translated_text,
                    "duration": trans.duration,
                }
                for lang, trans in episode.translations.items()
            }

        return {
            "id": str(episode.id),
            "title": episode.title,
            "description": episode.description,
            "audioUrl": audio_url,
            "originalAudioUrl": episode.audio_url,  # ✅ Always show original
            "duration": episode.duration,
            "episodeNumber": episode.episode_number,
            "seasonNumber": episode.season_number,
            "publishedAt": episode.published_at.isoformat(),
            "thumbnail": episode.thumbnail,
            "availableLanguages": episode.available_languages if is_premium else [episode.original_language],  # ✅ Filter
            "originalLanguage": episode.original_language,
            "translations": exposed_translations,  # ✅ Filter based on premium
            "translationStatus": episode.translation_status,
            "requiresPremium": not is_premium and len(episode.available_languages) > 1,  # ✅ ADD: Premium indicator
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching episode {episode_id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch episode")
```

### 2. Frontend Protection

**File:** `web/src/components/player/PodcastLanguageSelector.tsx`

**Add premium protection:**

::: v-pre
```tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { GlassButton, GlassBadge } from '@bayit/shared/ui';
import logger from '@/utils/logger';

interface PodcastLanguageSelectorProps {
  availableLanguages: string[];
  currentLanguage: string;
  onLanguageChange: (language: string) => Promise<void>;
  isLoading?: boolean;
  error?: string;
  isPremium?: boolean;  // ✅ ADD: Premium status
  onShowUpgrade?: () => void;  // ✅ ADD: Upgrade handler
}

const LANGUAGE_FLAGS: Record<string, string> = {
  he: '🇮🇱',
  en: '🇺🇸',
  es: '🇪🇸',
};

export function PodcastLanguageSelector({
  availableLanguages,
  currentLanguage,
  onLanguageChange,
  isLoading = false,
  error,
  isPremium = false,  // ✅ ADD: Default to false
  onShowUpgrade,  // ✅ ADD: Upgrade handler
}: PodcastLanguageSelectorProps) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';
  const [switchingTo, setSwitchingTo] = React.useState<string | null>(null);

  // ✅ ADD: Show original language only if only one language available
  if (availableLanguages.length <= 1) {
    return null;
  }

  const handleLanguageChange = async (lang: string) => {
    if (isLoading || switchingTo) return;

    // ✅ ADD: Premium check before switching
    if (!isPremium) {
      onShowUpgrade?.();
      return;
    }

    setSwitchingTo(lang);
    try {
      await onLanguageChange(lang);
    } catch (err) {
      logger.error('Language switch failed', 'PodcastLanguageSelector', err);
    } finally {
      setSwitchingTo(null);
    }
  };

  return (
    <View
      accessible={true}
      accessibilityRole="radiogroup"
      accessibilityLabel={t('podcast.selectLanguage')}
      style={[styles.container, isRTL && styles.containerRTL]}
    >
      <Text style={styles.label}>
        {t('podcast.selectLanguage')}:
      </Text>

      {/* ✅ ADD: Premium badge if not premium */}
      {!isPremium && availableLanguages.length > 1 && (
        <GlassBadge
          label="PREMIUM"
          variant="premium"
          style={styles.premiumBadge}
        />
      )}

      <View style={[styles.buttonsContainer, isRTL && styles.buttonsContainerRTL]}>
        {availableLanguages.map((lang) => {
          const isCurrent = lang === currentLanguage;
          const isSwitching = switchingTo === lang;

          return (
            <GlassButton
              key={lang}
              variant={isCurrent ? 'primary' : isPremium ? 'secondary' : 'ghost'}  // ✅ MODIFY: Ghost for non-premium
              size="md"
              onPress={() => handleLanguageChange(lang)}
              disabled={isLoading || isSwitching || !isPremium}  // ✅ MODIFY: Disable if not premium
              accessibilityLabel={
                isPremium
                  ? t(`podcast.switchToLanguage`, { language: t(`podcast.languages.${lang}.full`) })
                  : t('podcast.premiumRequiredForTranslation')  // ✅ ADD: Premium message
              }
              // @ts-ignore - Custom accessibility props
              accessibilityState={{ selected: isCurrent, disabled: !isPremium }}
              accessibilityRole="radio"
              style={styles.button}
              title={
                isSwitching
                  ? t('podcast.player.switchingLanguage')
                  : `${LANGUAGE_FLAGS[lang]} ${t(`podcast.languages.${lang}.short`)}`
              }
            />
          );
        })}
      </View>
      {error && (
        <Text style={styles.error} accessibilityLive="assertive" accessibilityRole="alert">
          {error}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  containerRTL: {
    flexDirection: 'row-reverse',
  },
  label: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    fontWeight: '500',
  },
  premiumBadge: {  // ✅ ADD: Badge styles
    marginLeft: 8,
  },
  buttonsContainer: {
    flexDirection: 'row',
    gap: 4,
  },
  buttonsContainerRTL: {
    flexDirection: 'row-reverse',
  },
  button: {
    minWidth: 100,
    minHeight: 44,
  },
  error: {
    color: 'rgba(248, 113, 113, 1)',
    fontSize: 12,
    marginTop: 4,
  },
});
```
:::

### 3. Update Parent Components

**File:** `web/src/hooks/usePodcastPlayer.ts` (or wherever PodcastLanguageSelector is used)

**Add premium status and upgrade handler:**

```tsx
import { useAuthStore } from '@/stores/authStore';
import { useNavigate } from 'react-router-dom';

export function usePodcastPlayer() {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  // ✅ ADD: Check premium status
  const isPremium = user?.can_access_premium_features() || false;

  // ✅ ADD: Upgrade handler
  const handleShowUpgrade = () => {
    navigate('/subscribe');
  };

  return {
    // ... existing returns
    isPremium,
    onShowUpgrade: handleShowUpgrade,
  };
}
```

## Implementation Checklist

### Backend
- [ ] Add `get_optional_user` dependency to episode endpoint
- [ ] Filter `availableLanguages` based on premium status
- [ ] Filter `translations` object based on premium status
- [ ] Only serve translated `audioUrl` if user has premium
- [ ] Add `requiresPremium` field to response
- [ ] Test with premium and non-premium users
- [ ] Verify 403 is NOT returned (feature gracefully degrades)

### Frontend
- [ ] Add `isPremium` prop to `PodcastLanguageSelector`
- [ ] Add `onShowUpgrade` prop to `PodcastLanguageSelector`
- [ ] Display premium badge when not premium
- [ ] Disable language switching buttons when not premium
- [ ] Show upgrade modal/navigate to subscribe page on button press
- [ ] Update all usages of `PodcastLanguageSelector` to pass premium props
- [ ] Add i18n translations for `podcast.premiumRequiredForTranslation`
- [ ] Test UI behavior with premium and non-premium users

### Testing
- [ ] Test non-premium user sees only original language
- [ ] Test non-premium user cannot switch to translated audio
- [ ] Test premium user sees all available languages
- [ ] Test premium user can switch languages successfully
- [ ] Test upgrade flow triggers correctly for non-premium users
- [ ] Test API returns filtered data based on premium status
- [ ] Verify no console errors or warnings
- [ ] Test across all platforms (web, mobile, TV, tvOS)

## Security Considerations

1. **Server-Side Enforcement** - Premium check MUST be on server, not just UI
2. **Graceful Degradation** - Don't throw 403, just filter data
3. **URL Protection** - Translated audio URLs should be behind auth or signed URLs
4. **Audit Logging** - Track premium feature access attempts

## Revenue Impact

**Estimated Monthly Loss:** Without premium protection, users can access translated podcast episodes for free, undermining the premium tier value proposition. Based on similar features:
- Live Dubbing: Premium only
- LLM Search: Premium only
- Recordings: Premium only
- **Podcast Translation: Currently FREE** ❌

## Recommendations

1. **URGENT:** Implement premium protection immediately
2. Add usage analytics to track translation feature usage
3. Consider adding quota limits for premium users (e.g., X hours of translated audio per month)
4. Add A/B testing to measure conversion impact
5. Consider offering 1-2 free translated episodes as a trial

## Related Files

**Backend:**
- `backend/app/api/routes/podcasts.py` - User-facing endpoints
- `backend/app/api/routes/admin_podcast_episodes.py` - Admin endpoints
- `backend/app/core/security.py` - Security dependencies
- `backend/app/models/user.py` - User premium check

**Frontend:**
- `web/src/components/player/PodcastLanguageSelector.tsx` - Language selector UI
- `web/src/hooks/usePodcastPlayer.ts` - Player hook
- `shared/components/player/LiveDubbingControls.tsx` - Reference implementation
- `shared/components/search/LLMSearchButton.tsx` - Reference implementation

## Conclusion

The podcast translation feature **LACKS critical premium protection** that exists in all other premium features. This represents both a security vulnerability and revenue loss. Implementation should follow the established patterns used by Live Dubbing, LLM Search, and Recordings features.

**Priority:** 🔴 **CRITICAL - IMMEDIATE ACTION REQUIRED**
