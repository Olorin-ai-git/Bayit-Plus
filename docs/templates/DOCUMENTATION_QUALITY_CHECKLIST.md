# Documentation Quality Checklist

Use this checklist before submitting or finalizing any documentation.

## Content Quality

### Structure & Organization

- [ ] **Uses correct template** (Feature, API, Code Review, Implementation, or User Guide)
- [ ] **All required sections present** (as per template)
- [ ] **Logical section order** (Overview → Details → How-to → Reference)
- [ ] **Table of contents** (for documents > 500 lines)
- [ ] **Clear document purpose** stated in introduction

### Writing Quality

- [ ] **Clear and concise writing** (no unnecessary jargon)
- [ ] **Active voice used** (prefer "Click the button" over "The button should be clicked")
- [ ] **Audience-appropriate language** (technical for developers, simple for end users)
- [ ] **Consistent terminology** (same terms used throughout)
- [ ] **No ambiguity** (clear instructions, no "maybe" or "probably")
- [ ] **Complete sentences** (proper grammar and punctuation)
- [ ] **Spell-checked** (no spelling errors)
- [ ] **Paragraph length reasonable** (3-5 sentences max)

### Technical Accuracy

- [ ] **All code examples tested** (actually runs without errors)
- [ ] **API endpoints correct** (verified against actual implementation)
- [ ] **Commands verified** (tested in real environment)
- [ ] **Version numbers accurate** (matches actual software versions)
- [ ] **Links working** (all internal and external links valid)
- [ ] **Screenshots current** (match latest UI, no outdated images)
- [ ] **Configuration values correct** (environment variables, settings)

## Code Examples

### Code Quality

- [ ] **All code examples syntax-highlighted** (use triple backticks with language)
- [ ] **Code examples complete** (not just snippets, show full context)
- [ ] **Code examples tested** (confirmed working in actual environment)
- [ ] **Code follows project standards** (matches coding conventions)
- [ ] **Code examples commented** (explain complex logic)
- [ ] **Error handling shown** (demonstrate proper error handling)
- [ ] **TypeScript interfaces provided** (for API endpoints, data models)

### Code Example Checklist

**For Backend Examples:**
```python
# ✅ Good example - Complete, tested, commented
from app.services.feature import FeatureService

async def get_feature(feature_id: str):
    """
    Get feature by ID.

    Args:
        feature_id: Feature identifier

    Returns:
        Feature object or None if not found
    """
    service = FeatureService()
    return await service.get(feature_id)
```

**For Frontend Examples:**
::: v-pre
```typescript
// ✅ Good example - Type-safe, complete, with error handling
interface Feature {
  id: string;
  name: string;
  created_at: string;
}

const fetchFeature = async (id: string): Promise<Feature> => {
  try {
    const response = await fetch(`/api/v1/features/${id}`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch feature:', error);
    throw error;
  }
};
```
:::

- [ ] **All examples follow this standard**

## Cross-References & Links

### Internal Links

- [ ] **All internal links use relative paths** (e.g., `../api/API_REFERENCE.md`)
- [ ] **All internal links verified** (destination files exist)
- [ ] **Link text descriptive** (not "click here", use "API Reference")
- [ ] **Related documents linked** (in "Related Documents" section)

### External Links

- [ ] **External links absolute** (use full URLs)
- [ ] **External links open in new tab** (when applicable)
- [ ] **External links verified** (not 404)
- [ ] **External links stable** (not likely to change)

## Formatting

### Markdown Standards

- [ ] **Headers hierarchical** (H1 → H2 → H3, no skipping levels)
- [ ] **Code blocks use language** (```python, ```typescript, etc.)
- [ ] **Tables formatted correctly** (aligned, all rows complete)
- [ ] **Lists consistent** (all bullet or all numbered, proper indentation)
- [ ] **Emphasis used sparingly** (**bold** for important, *italic* for emphasis)
- [ ] **Line length reasonable** (wrap at 120 characters)

### Visual Elements

- [ ] **Screenshots included** (for UI-heavy features)
- [ ] **Screenshots captioned** (use `![Caption](path)` format)
- [ ] **Screenshots current** (match latest UI version)
- [ ] **Diagrams included** (for architecture, flow diagrams)
- [ ] **Diagrams clear** (readable, not too complex)
- [ ] **Icons used appropriately** (✅ ❌ ⚠️ 💡 🚀 for status/tips)

## Metadata

### Document Information

- [ ] **Title clear and descriptive**
- [ ] **Status indicated** (Draft/In Review/Approved/Complete)
- [ ] **Author/team listed**
- [ ] **Date created included** (YYYY-MM-DD format)
- [ ] **Last updated date** (YYYY-MM-DD format)
- [ ] **Version number** (if applicable)

### File Naming

- [ ] **File name follows convention** (FEATURE_NAME_TYPE.md)
- [ ] **File name uppercase** (with underscores)
- [ ] **File name descriptive** (clear what doc contains)
- [ ] **File name unique** (no duplicates)

### Directory Placement

- [ ] **Placed in correct directory** (not in root)
- [ ] **Directory exists** (created if necessary)
- [ ] **Indexed in README.md** (entry added to documentation index)
- [ ] **Indexed in DOCUMENTATION_INDEX.md** (if applicable)

## Platform-Specific

### Web Documentation

- [ ] **Browser compatibility listed**
- [ ] **Keyboard shortcuts documented**
- [ ] **Responsive design considerations**
- [ ] **Performance metrics** (FCP, LCP, TTI)

### Mobile Documentation

- [ ] **iOS and Android sections separate** (platform-specific notes)
- [ ] **Gestures documented**
- [ ] **Safe area handling mentioned**
- [ ] **Platform-specific code examples**

### tvOS Documentation

- [ ] **Focus navigation explained**
- [ ] **Siri Remote controls documented**
- [ ] **10-foot UI considerations**
- [ ] **TVFocusGuideView examples**

## Security & Privacy

- [ ] **No secrets or credentials** (API keys, passwords, tokens)
- [ ] **Placeholder values used** (YOUR_API_KEY, example.com)
- [ ] **Privacy considerations mentioned** (PII handling, GDPR)
- [ ] **Security warnings included** (potential risks, best practices)
- [ ] **Authentication requirements clear**

## Accessibility

### WCAG Compliance

- [ ] **Alt text for images** (descriptive, not decorative)
- [ ] **Color not sole indicator** (use icons + color)
- [ ] **Contrast sufficient** (for diagrams, screenshots)
- [ ] **Keyboard navigation mentioned** (if interactive)
- [ ] **Screen reader considerations** (if applicable)

## Internationalization

- [ ] **RTL support mentioned** (if UI-related, especially Hebrew)
- [ ] **Locale examples included** (date/time/number formatting)
- [ ] **Translation keys referenced** (i18n keys documented)
- [ ] **Language selection UI** (if multi-language feature)

## Testing & Validation

### Before Publishing

- [ ] **All commands tested** (in real environment)
- [ ] **All links clicked** (verified working)
- [ ] **Screenshots reviewed** (current and clear)
- [ ] **Code examples run** (confirmed working)
- [ ] **Peer reviewed** (second pair of eyes)
- [ ] **Technical review completed** (by subject matter expert)
- [ ] **User testing** (if user guide, tested with target audience)

### CI/CD Integration

- [ ] **Automated link checker passing** (if enabled)
- [ ] **Spell checker passing** (if enabled)
- [ ] **Markdown linter passing** (if enabled)

## Version Control

### Git Practices

- [ ] **Committed to correct branch**
- [ ] **Commit message descriptive** (docs: add feature guide)
- [ ] **PR created** (if required by workflow)
- [ ] **PR description complete** (what was added/changed)
- [ ] **PR linked to issue** (if applicable)

## Maintenance

### Long-Term Considerations

- [ ] **Review date set** (when to review for updates)
- [ ] **Deprecation process mentioned** (if feature might change)
- [ ] **Versioning strategy** (how doc versions are managed)
- [ ] **Changelog included** (version history at bottom)

## Final Checklist

Before marking documentation as complete:

- [ ] ✅ All above checklists completed
- [ ] ✅ No outstanding feedback or comments
- [ ] ✅ All required approvals obtained
- [ ] ✅ Indexed in documentation hub
- [ ] ✅ Published to appropriate platform
- [ ] ✅ Team notified of new/updated documentation

---

## Checklist Usage

### For New Documentation

1. **Select template** (Feature, API, Code Review, Implementation, User Guide)
2. **Fill in all sections**
3. **Run through this checklist**
4. **Get peer review**
5. **Address all feedback**
6. **Publish and index**

### For Updated Documentation

1. **Make updates**
2. **Update "Last Updated" date**
3. **Update version/changelog**
4. **Run through relevant sections of this checklist**
5. **Get review if significant changes**
6. **Publish updates**

---

**Checklist Version:** 1.0
**Last Updated:** 2026-01-30
**Maintained by:** Documentation Team
