# API Deprecation Strategy

**Status**: Active
**Author**: API Team
**Date**: 2025-11-01
**Target Audience**: API developers, Product managers, Frontend teams

---

## Executive Summary

This document defines the process for deprecating API versions, endpoints, and fields in a way that minimizes disruption to clients while allowing the API to evolve.

**Key Principles**:
- **Announce Early**: Give clients advance notice (minimum 3 months before deprecation)
- **Support Longer**: Maintain deprecated features for minimum 6 months after deprecation
- **Communicate Clearly**: Use headers, docs, and notifications
- **Provide Alternatives**: Always document migration path

**Deprecation Timeline**:
```
Announcement (T+0) → Deprecation (T+3mo) → Support (T+3-9mo) → Sunset (T+9mo)
```

---

## Deprecation Levels

### 1. Field Deprecation (Minor Impact)

**Use When**: Replacing a field with a better alternative.

**Timeline**: 6 months minimum support after deprecation.

**Example**:
```yaml
# Deprecated field
InvestigationResponse:
  properties:
    legacy_status:
      type: string
      deprecated: true
      description: "Deprecated. Use 'status' instead. Will be removed in v2.0 (2026-06-01)."
    status:
      type: string
      description: "Current status of investigation"
```

**HTTP Headers**:
```http
HTTP/1.1 200 OK
Deprecation: true
Sunset: Sun, 01 Jun 2026 00:00:00 GMT
Link: <https://api.olorin.example.com/docs/api/deprecations#legacy-status>; rel="deprecation"
```

**Client Impact**: **Low** - Clients can migrate at their own pace within support window.

---

### 2. Endpoint Deprecation (Medium Impact)

**Use When**: Replacing an endpoint with a new one or removing functionality.

**Timeline**: 9 months minimum support after deprecation.

**Example**:
```yaml
# Deprecated endpoint
/api/v1/legacy/investigations:
  get:
    summary: List investigations (DEPRECATED)
    deprecated: true
    description: >
      Deprecated. Use /api/v1/investigations/ instead.
      This endpoint will be removed on 2026-09-01.
```

**HTTP Headers**:
```http
HTTP/1.1 200 OK
Deprecation: true
Sunset: Mon, 01 Sep 2026 00:00:00 GMT
Link: <https://api.olorin.example.com/docs/api/v2-migration>; rel="deprecation"
Warning: 299 - "This endpoint is deprecated. Use /api/v1/investigations/ instead."
```

**Client Impact**: **Medium** - Clients must update endpoint URLs.

---

### 3. API Version Deprecation (High Impact)

**Use When**: Releasing a new major version (v1 → v2).

**Timeline**: 12 months minimum support after deprecation.

**Example**:
```
/api/v1/ (Active) → /api/v1/ (Deprecated) → /api/v1/ (Sunset)
         T+0              T+3mo                  T+15mo
```

**HTTP Headers**:
```http
HTTP/1.1 200 OK
Deprecation: true
Sunset: Sat, 01 Mar 2027 00:00:00 GMT
Link: <https://api.olorin.example.com/docs/api/v2-migration>; rel="deprecation"
Link: <https://api.olorin.example.com/api/v2>; rel="successor-version"
Warning: 299 - "API v1 is deprecated. Migrate to v2 by 2027-03-01."
```

**Client Impact**: **High** - Clients must migrate to new version.

---

## Deprecation Process

### Phase 1: Announcement (T+0 months)

**Actions**:
1. **Update OpenAPI Schema**:
   ```yaml
   deprecated: true
   description: "Deprecated. Use alternative. Will be removed on YYYY-MM-DD."
   ```

2. **Add Deprecation Metadata**:
   ```yaml
   x-sunset-date: "2026-12-01"
   x-alternative: "/api/v2/investigations/"
   x-deprecation-reason: "Replaced with more efficient endpoint"
   ```

3. **Create Migration Guide**:
   ```markdown
   # Migration Guide: v1 → v2
   - Field Changes: [list]
   - Endpoint Changes: [list]
   - Breaking Changes: [list]
   - Migration Timeline: [timeline]
   ```

4. **Announce via Channels**:
   - API documentation website
   - Email to registered API clients
   - Slack/Discord announcements
   - Blog post with migration guide

5. **Track Usage**:
   ```python
   # Add deprecation tracking
   from app.logging import log_deprecation

   @router.get("/api/v1/legacy/investigations/")
   def legacy_list_investigations():
       log_deprecation(
           endpoint="/api/v1/legacy/investigations/",
           sunset_date="2026-12-01",
           alternative="/api/v1/investigations/"
       )
       # ... endpoint logic
   ```

---

### Phase 2: Deprecation (T+3 months)

**Actions**:
1. **Add HTTP Deprecation Headers** (all deprecated resources):
   ```python
   from datetime import datetime
   from fastapi import Response

   @router.get("/api/v1/legacy/investigations/")
   def legacy_list_investigations(response: Response):
       response.headers["Deprecation"] = "true"
       response.headers["Sunset"] = "Sun, 01 Dec 2026 00:00:00 GMT"
       response.headers["Link"] = '<https://api.olorin.example.com/docs/v2-migration>; rel="deprecation"'
       response.headers["Warning"] = '299 - "This endpoint is deprecated."'
       # ... endpoint logic
   ```

2. **Update Documentation**:
   - Mark as deprecated in all API docs
   - Add prominent deprecation notices
   - Link to migration guide

3. **Monitor Usage**:
   ```sql
   -- Track deprecation metrics
   SELECT
     deprecated_endpoint,
     COUNT(*) as usage_count,
     COUNT(DISTINCT client_id) as unique_clients
   FROM api_logs
   WHERE deprecated_endpoint IS NOT NULL
   GROUP BY deprecated_endpoint;
   ```

4. **Notify Heavy Users**:
   - Email clients still using deprecated features
   - Provide migration assistance

---

### Phase 3: Support Period (T+3 to T+9 months)

**Actions**:
1. **Continue Supporting** (no functional changes):
   - Keep deprecated features working
   - Fix critical bugs only (no enhancements)
   - Maintain test coverage

2. **Increase Warning Visibility**:
   ```python
   # Add prominent warnings 6 months before sunset
   if days_until_sunset <= 180:
       response.headers["Warning"] = (
           f'299 - "This endpoint will be removed in {days_until_sunset} days. '
           f'Migrate to /api/v1/investigations/ immediately."'
       )
   ```

3. **Final Migration Push** (T+6 months):
   - Email all remaining users
   - Offer migration support
   - Escalate to product/engineering teams for critical integrations

4. **Usage Monitoring**:
   ```python
   # Alert if usage is still high close to sunset
   if days_until_sunset <= 30 and daily_usage > threshold:
       alert_team(
           f"High usage of deprecated endpoint {days_until_sunset} days before sunset"
       )
   ```

---

### Phase 4: Sunset (T+9 months minimum)

**Actions**:
1. **Remove Deprecated Features**:
   ```python
   # Return HTTP 410 Gone
   @router.get("/api/v1/legacy/investigations/")
   def legacy_list_investigations():
       raise HTTPException(
           status_code=410,
           detail={
               "error": "gone",
               "message": "This endpoint was sunset on 2026-12-01.",
               "alternative": "/api/v1/investigations/",
               "migration_guide": "https://api.olorin.example.com/docs/v2-migration"
           }
       )
   ```

2. **Update Documentation**:
   - Remove from API docs
   - Keep migration guide available
   - Archive old version docs

3. **Post-Sunset Monitoring**:
   - Track 410 responses
   - Reach out to clients still attempting to use deprecated features

---

## Deprecation Timeline by Impact

| Deprecation Type | Announcement | Deprecation | Minimum Support | Total Timeline |
|------------------|--------------|-------------|-----------------|----------------|
| Field            | T+0          | T+3mo       | 6 months        | 9 months       |
| Endpoint         | T+0          | T+3mo       | 9 months        | 12 months      |
| API Version      | T+0          | T+3mo       | 12 months       | 15 months      |

---

## HTTP Status Codes for Deprecated Features

### During Support Period
```http
# Still works, but deprecated
HTTP/1.1 200 OK
Deprecation: true
Sunset: Sun, 01 Dec 2026 00:00:00 GMT
Link: <https://api.olorin.example.com/docs/v2-migration>; rel="deprecation"
```

### After Sunset
```http
# Removed, returns 410 Gone
HTTP/1.1 410 Gone
Content-Type: application/json

{
  "error": "gone",
  "message": "This endpoint was sunset on 2026-12-01.",
  "sunset_date": "2026-12-01",
  "alternative": "/api/v1/investigations/",
  "migration_guide": "https://api.olorin.example.com/docs/v2-migration"
}
```

---

## Deprecation Headers Reference

### 1. Deprecation Header
```http
Deprecation: true
```
**Purpose**: Indicates the resource is deprecated.

---

### 2. Sunset Header (RFC 8594)
```http
Sunset: Sun, 01 Dec 2026 00:00:00 GMT
```
**Purpose**: Indicates when the resource will be removed.
**Format**: HTTP-date format (RFC 7231)

---

### 3. Link Header (RFC 8288)
```http
Link: <https://api.olorin.example.com/docs/v2-migration>; rel="deprecation"
Link: <https://api.olorin.example.com/api/v2>; rel="successor-version"
```
**Purpose**: Links to migration guide and successor version.

---

### 4. Warning Header (RFC 7234)
```http
Warning: 299 - "This endpoint is deprecated. Migrate to v2."
```
**Purpose**: Human-readable deprecation warning.
**Code 299**: Miscellaneous persistent warning.

---

## Monitoring and Alerting

### Usage Metrics to Track
```sql
-- Deprecated endpoint usage by client
SELECT
  client_id,
  deprecated_endpoint,
  COUNT(*) as daily_calls,
  MAX(timestamp) as last_used
FROM api_logs
WHERE
  deprecated_endpoint IS NOT NULL
  AND timestamp >= CURRENT_DATE - INTERVAL '1 day'
GROUP BY client_id, deprecated_endpoint
ORDER BY daily_calls DESC;
```

### Alerts to Configure
1. **High usage of deprecated feature** (30 days before sunset)
2. **New clients using deprecated features**
3. **Deprecated features called after sunset date**

---

## Communication Templates

### Announcement Email Template
```
Subject: [Action Required] API Deprecation Notice - [Feature Name]

Hi [Client Name],

We're writing to inform you that [feature/endpoint/version] will be deprecated.

Timeline:
- Announcement: [Date]
- Deprecation: [Date + 3 months]
- Sunset: [Date + 9-15 months]

What This Means:
- [Feature] will continue to work until [sunset date]
- You must migrate to [alternative] by [sunset date]
- After [sunset date], [feature] will return HTTP 410 Gone

Migration Guide:
[Link to migration guide]

Support:
If you need assistance migrating, please contact us at [support email]

Thank you,
Olorin API Team
```

---

### Deprecation Warning Template
```
Subject: [Urgent] API Sunset Approaching - [Feature Name]

Hi [Client Name],

Our records show you're still using deprecated [feature/endpoint/version].

This feature will be removed in [days] days on [sunset date].

Action Required:
1. Review migration guide: [link]
2. Update your code to use [alternative]
3. Test thoroughly before [sunset date]

Need Help?
Contact us at [support email] for migration assistance.

Thank you,
Olorin API Team
```

---

## Client Migration Checklist

For clients using deprecated features:

- [ ] Review deprecation notice and sunset date
- [ ] Read migration guide
- [ ] Identify all code using deprecated features
- [ ] Update code to use alternative
- [ ] Update API client libraries (if applicable)
- [ ] Test changes in staging environment
- [ ] Deploy to production before sunset date
- [ ] Monitor for errors after migration
- [ ] Remove old code referencing deprecated features

---

## Exception Process

In rare cases, sunset dates may be extended:

**Valid Reasons**:
- Critical production issue affecting major client
- Insufficient time for complex migration (enterprise clients)
- Missing functionality in successor version

**Process**:
1. Client submits extension request with justification
2. API team reviews and approves/denies
3. If approved: extend sunset by max 3 months
4. Document exception and reason
5. Require firm migration commitment date

---

## Deprecation Documentation

All deprecations must be documented in:

1. **OpenAPI Schema** (`deprecated: true`)
2. **API Changelog** (`CHANGELOG.md`)
3. **Migration Guide** (`/docs/api/migration-*.md`)
4. **Deprecation Log** (`/docs/api/deprecations.md`)

---

## Resources

- **RFC 8594 (Sunset Header)**: https://www.rfc-editor.org/rfc/rfc8594.html
- **RFC 8288 (Link Header)**: https://www.rfc-editor.org/rfc/rfc8288.html
- **RFC 7234 (Warning Header)**: https://www.rfc-editor.org/rfc/rfc7234.html
- **API Versioning Strategy**: `/docs/api/versioning-strategy.md`
- **Schema Evolution Guidelines**: `/docs/api/schema-evolution-guidelines.md`
- **Migration Guide Template**: `/docs/api/migration-guide-template.md`

---

**Last Updated**: 2025-11-01
**Document Version**: 1.0.0
**Maintained By**: API Team
