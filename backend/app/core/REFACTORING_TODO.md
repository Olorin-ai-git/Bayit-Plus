# Configuration Refactoring TODO

## olorin_config.py - Deferred for Future Refactoring

**Status:** ⏸️ Deferred (Low Priority)  
**Current:** 1,115 lines  
**Target:** < 200 lines per file  
**Complexity:** High

### Why Deferred
- Configuration files change less frequently than service logic
- Requires refactoring 15+ configuration classes
- 2 classes (DubbingConfig, LiveTriviaConfig) exceed 200 lines themselves
- High risk of breaking environment variable loading
- Requires extensive testing across all deployment environments

### Refactoring Plan (When Ready)

Create package: `app/core/olorin_config/`

**Simple configs (< 100 lines each):**
- `partner_api.py` - PartnerAPIConfig (39 lines)
- `vector_search.py` - PineconeConfig + EmbeddingConfig (38 lines)
- `recap.py` - RecapConfig (38 lines)
- `cultural_context.py` - CulturalContextConfig (26 lines)
- `metering.py` - MeteringConfig (42 lines)
- `infrastructure.py` - InfrastructureConfig (33 lines)
- `cost_tracking.py` - ThirdPartyCostConfig + CostAggregationConfig (79 lines)
- `resilience.py` - ResilienceConfig (53 lines)
- `database.py` - DatabaseConfig (36 lines)
- `channel_chat.py` - ChannelChatConfig (58 lines)

**Medium configs:**
- `subtitle.py` - SubtitleConfig (131 lines)

**Complex configs (need sub-packages):**
- `dubbing/` - DubbingConfig (251 lines) → Split into multiple files
- `live_trivia/` - LiveTriviaConfig (276 lines) → Split into multiple files

**Main aggregator:**
- `settings.py` - OlorinSettings (~150 lines)
- `__init__.py` - Backward compatibility exports

### Prerequisites Before Refactoring
- [ ] All deployment environments documented
- [ ] Environment variable inventory complete
- [ ] Comprehensive config loading tests written
- [ ] Staging environment for testing config changes
- [ ] Rollback plan documented

### Estimated Effort
- Planning: 2 hours
- Implementation: 6-8 hours
- Testing: 4 hours
- **Total:** 12-14 hours

### Priority
**Low** - Configuration stability is more important than file size compliance for this file.

---

*Created: 2026-01-31*  
*Last Updated: 2026-01-31*
