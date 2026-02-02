# Split-Screen Subtitles - Platform Limitation

**Date:** 2026-02-01
**Status:** Not Feasible with Current Stack
**Priority:** Low (Future Enhancement)

## Summary

Split-screen subtitles (displaying two subtitle tracks simultaneously in different languages) is **not natively supported** by react-native-video, the video player library used across Bayit+ mobile and tvOS platforms.

## Research Findings

### react-native-video Capabilities

**Current Support:**
- ✅ Multiple subtitle formats (VTT, SRT, etc.)
- ✅ Multiple subtitle tracks per video
- ✅ Dynamic switching between subtitle languages
- ✅ Single subtitle track display at a time

**Not Supported:**
- ❌ Simultaneous display of multiple subtitle tracks
- ❌ Dual subtitle overlay (e.g., Hebrew + English together)

According to the official documentation and GitHub issues, "If multiple tracks match the criteria, the first match will be used." The `selectedTextTrack` prop only allows one track to be active at a time.

### Alternative Approaches Investigated

#### 1. Custom Subtitle Rendering (Complex)
**Feasibility:** Possible but high complexity

**Approach:**
- Use `onTextTrackDataChanged` event to capture subtitle data
- Load two subtitle tracks programmatically
- Render second subtitle track as a custom `<Text>` overlay component
- Manually handle timing, positioning, and synchronization

**Challenges:**
- Manual subtitle parsing and timing synchronization
- Performance overhead (two subtitle streams)
- Platform-specific subtitle format handling
- Increased maintenance burden

**Estimated Effort:** 5-7 days

#### 2. Third-Party Packages
**Evaluated:**
- `@hyeonwoo/react-native-video-controls-subtitle`
- `@skilled-apps/react-native-video-with-subtitles`

**Result:** None support dual subtitle display. These packages enhance single subtitle support (styling, positioning) but don't enable simultaneous multi-track rendering.

#### 3. VLC Media Player Alternative
**react-native-vlc-media-player** supports "multiple subtitle tracks" but unclear if simultaneous display is supported.

**Concerns:**
- Different API from react-native-video
- Migration effort across all video components
- Less community support than react-native-video

### Web Platform

On the web platform using HTML5 `<video>` element:
- Native `<track>` elements only support one active track
- Custom dual subtitle rendering is more feasible (DOM manipulation)
- Could implement web-only split-screen subtitles

## Recommendation

### Short-Term (Current Release)
**Status:** ⚠️ Document as Not Available

Split-screen subtitles should be marked as **not available** on mobile/tvOS platforms due to platform limitations. Focus on the implemented AI subtitle modes (Nikud, Shoresh, Heblish, etc.) which provide significant value for Hebrew learners.

### Mid-Term (Future Enhancement)
**Priority:** Low - Implement only if user demand justifies effort

**Option A: Custom Implementation (Mobile/tvOS)**
- Implement custom subtitle overlay system
- Support 2-3 most requested language pairs (e.g., Hebrew + English)
- Estimated: 5-7 days development + 2-3 days testing

**Option B: Web-Only Feature**
- Implement split-screen subtitles for web platform only
- Use HTML5 video capabilities
- Mobile/tvOS users use AI subtitle modes instead
- Estimated: 3-4 days development

**Option C: Defer Indefinitely**
- Wait for react-native-video to add native support
- Monitor GitHub feature requests
- Revisit when/if library adds dual subtitle capability

### Long-Term
**Future Consideration:** Monitor language learning features in competitor apps. If split-screen subtitles become table stakes for streaming platforms, prioritize custom implementation.

## User Impact

**Low Impact:**
- Feature gap exists but AI subtitle modes (Nikud, Shoresh, Heblish, Slang) provide comparable learning value
- Most users select one subtitle language at a time
- Language learners can use single subtitle + AI enhancement modes

**Workarounds for Users:**
1. Use AI subtitle modes (6 modes available for Hebrew)
2. Switch between subtitle languages dynamically
3. Use pause/replay for challenging sections
4. External subtitle apps (language learners often use separate tools)

## Decision

**DEFERRED:** Split-screen subtitles implementation is deferred until:
1. User demand increases (feature requests, support tickets)
2. react-native-video adds native support
3. Competitor analysis shows it's a must-have feature

**Rationale:**
- High implementation complexity vs. low user demand
- AI subtitle modes provide strong alternative for language learning
- Development time better spent on high-priority features

## References

- [React Native Video Documentation](https://docs.thewidlarzgroup.com/react-native-video/)
- [react-native-video subtitle support issue #1044](https://github.com/react-native-video/react-native-video/issues/1044)
- [Feature request for subtitle flexibility #3579](https://github.com/react-native-video/react-native-video/issues/3579)
- [Dual Subtitles for Language Learning](https://lingopie.com/blog/lingopie-dual-subtitles/)

## Related Features

- ✅ AI Subtitle Modes (Implemented)
- ✅ Single Subtitle Track Support (Existing)
- ✅ Dynamic Language Switching (Existing)
- ⏳ Split-Screen Subtitles (Deferred)

---

**Last Updated:** 2026-02-01
**Reviewed By:** Implementation Team
**Next Review:** Q2 2026 (re-evaluate based on user feedback)
