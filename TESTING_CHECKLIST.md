# Content Management System - Testing Checklist

## Overview
This document outlines comprehensive test cases for the complete content management system implementation.

---

## Phase 1: Backend API Testing

### 1.1 Content CRUD Operations
- [ ] **Create Content (VOD)**
  - [ ] POST /admin/content with valid data
  - [ ] Verify response contains generated ID
  - [ ] Verify audit log entry created with CONTENT_CREATED action
  - [ ] Test with required fields only
  - [ ] Test with all optional fields

- [ ] **Read Content**
  - [ ] GET /admin/content (list with pagination)
  - [ ] Verify pagination works (page, page_size, total)
  - [ ] GET /admin/content/{id} (single item)
  - [ ] Verify 404 for non-existent ID

- [ ] **Update Content**
  - [ ] PATCH /admin/content/{id} with partial update
  - [ ] PATCH /admin/content/{id} with full update
  - [ ] Verify audit log entry with CONTENT_UPDATED action
  - [ ] Test conditional field updates (season/episode when is_series=true)

- [ ] **Delete Content**
  - [ ] DELETE /admin/content/{id}
  - [ ] Verify item removed from list
  - [ ] Verify audit log entry with CONTENT_DELETED action
  - [ ] Verify 404 on second delete attempt

### 1.2 Content Filtering & Search
- [ ] **Search by title**
  - [ ] GET /admin/content?search=keyword
  - [ ] Verify results contain keyword in title or description

- [ ] **Filter by category**
  - [ ] GET /admin/content?category_id=xyz
  - [ ] Verify only items with matching category returned

- [ ] **Filter by status**
  - [ ] GET /admin/content?is_published=true
  - [ ] GET /admin/content?is_published=false
  - [ ] Verify correct items returned

- [ ] **Filter by featured**
  - [ ] GET /admin/content?is_featured=true
  - [ ] Verify only featured items returned

- [ ] **Composite filters**
  - [ ] GET /admin/content?search=movie&is_published=true&category_id=abc
  - [ ] Verify all filters applied correctly

### 1.3 Publish/Feature Operations
- [ ] **Publish Content**
  - [ ] POST /admin/content/{id}/publish (when is_published=false)
  - [ ] Verify is_published toggles to true
  - [ ] Verify audit log entry with CONTENT_PUBLISHED action

- [ ] **Unpublish Content**
  - [ ] POST /admin/content/{id}/publish (when is_published=true)
  - [ ] Verify is_published toggles to false
  - [ ] Verify audit log entry with CONTENT_UNPUBLISHED action

- [ ] **Feature Content**
  - [ ] POST /admin/content/{id}/feature (when is_featured=false)
  - [ ] Verify is_featured toggles to true
  - [ ] POST /admin/content/{id}/feature (when is_featured=true)
  - [ ] Verify is_featured toggles to false

### 1.4 Category CRUD
- [ ] **Create Category**
  - [ ] POST /admin/categories with name, name_en, slug
  - [ ] Verify audit log entry with CATEGORY_CREATED action

- [ ] **List Categories**
  - [ ] GET /admin/categories
  - [ ] Verify pagination works
  - [ ] Test ordering

- [ ] **Update Category**
  - [ ] PATCH /admin/categories/{id}
  - [ ] Verify audit log with CATEGORY_UPDATED action

- [ ] **Delete Category**
  - [ ] DELETE /admin/categories/{id}
  - [ ] Verify audit log with CATEGORY_DELETED action

### 1.5 Live Channels CRUD
- [ ] **Create Live Channel**
  - [ ] POST /admin/live-channels with stream_url
  - [ ] Verify audit log with LIVE_CHANNEL_CREATED action

- [ ] **Update Live Channel**
  - [ ] PATCH /admin/live-channels/{id}
  - [ ] Test EPG source update

- [ ] **Delete Live Channel**
  - [ ] DELETE /admin/live-channels/{id}
  - [ ] Verify audit log with LIVE_CHANNEL_DELETED action

### 1.6 Radio Stations CRUD
- [ ] **Create Radio Station**
  - [ ] POST /admin/radio-stations
  - [ ] Test genre field

- [ ] **Update Radio Station**
  - [ ] PATCH /admin/radio-stations/{id}
  - [ ] Test current_show and current_song updates

- [ ] **Delete Radio Station**
  - [ ] DELETE /admin/radio-stations/{id}

### 1.7 Podcasts & Episodes CRUD
- [ ] **Create Podcast**
  - [ ] POST /admin/podcasts
  - [ ] Verify RSS feed parsing (if implemented)

- [ ] **List Episodes**
  - [ ] GET /admin/podcasts/{id}/episodes
  - [ ] Verify pagination

- [ ] **Create Episode**
  - [ ] POST /admin/podcasts/{id}/episodes
  - [ ] Verify audit log with PODCAST_EPISODE_CREATED action

- [ ] **Update Episode**
  - [ ] PATCH /admin/podcasts/{id}/episodes/{episode_id}

- [ ] **Delete Episode**
  - [ ] DELETE /admin/podcasts/{id}/episodes/{episode_id}

### 1.8 Free Content Import
- [ ] **Get Available Sources**
  - [ ] GET /admin/content/import/free-sources/vod
  - [ ] GET /admin/content/import/free-sources/live_tv
  - [ ] GET /admin/content/import/free-sources/radio
  - [ ] GET /admin/content/import/free-sources/podcasts
  - [ ] Verify response structure and item counts

- [ ] **Import Free Content**
  - [ ] POST /admin/content/import/free-sources
  - [ ] Test with import_all=true
  - [ ] Test with import_all=false and specific items array
  - [ ] Verify all items created in database
  - [ ] Verify audit log with CONTENT_IMPORTED action

- [ ] **Test Different Source Types**
  - [ ] Import from archive.org (public domain films)
  - [ ] Import from Apple BipBop (test HLS streams)
  - [ ] Import from SomaFM (audio streams)
  - [ ] Import from public RSS feeds

### 1.9 Permissions & Authorization
- [ ] **Verify content_manager permission required**
  - [ ] Test API calls without auth token → 401 Unauthorized
  - [ ] Test with user lacking content_manager role → 403 Forbidden
  - [ ] Test with content_manager role → 200 Success

- [ ] **Verify RBAC for each operation**
  - [ ] CONTENT_CREATE permission checked for POST operations
  - [ ] CONTENT_UPDATE permission checked for PATCH operations
  - [ ] CONTENT_DELETE permission checked for DELETE operations

### 1.10 Image Upload
- [ ] **Upload Image**
  - [ ] POST /admin/uploads/image with file
  - [ ] Verify image is saved
  - [ ] Verify image is optimized
  - [ ] Verify response contains URL

- [ ] **Validate Image**
  - [ ] Test with invalid image format → 400 Bad Request
  - [ ] Test with oversized image → 413 Payload Too Large
  - [ ] Test with valid image → 200 Success

- [ ] **Presigned URL**
  - [ ] POST /admin/uploads/presigned-url
  - [ ] Verify URL is valid and usable
  - [ ] Test URL expiration

---

## Phase 2: Frontend UI Testing

### 2.1 Content Library Page
- [ ] **Page Load**
  - [ ] Loads without errors
  - [ ] Shows loading indicator while fetching
  - [ ] Displays content list when loaded
  - [ ] Pagination works correctly

- [ ] **Search Functionality**
  - [ ] Search input filters content by title
  - [ ] Results update in real-time
  - [ ] Clear search shows all items

- [ ] **Status Filter**
  - [ ] Filter by "Published" shows only published items
  - [ ] Filter by "Draft" shows only draft items
  - [ ] Filter by "All" shows all items

- [ ] **Actions**
  - [ ] Edit button navigates to edit page
  - [ ] Delete button shows confirmation dialog
  - [ ] Publish/unpublish toggles item status
  - [ ] Import button opens FreeContentImportWizard

- [ ] **Pagination**
  - [ ] Next/previous page buttons work
  - [ ] Direct page navigation works
  - [ ] Page size can be adjusted

- [ ] **Error Handling**
  - [ ] Network error displays error message
  - [ ] Error can be dismissed
  - [ ] Can retry loading

### 2.2 Content Editor Page
- [ ] **Create New Content**
  - [ ] Form loads with empty fields
  - [ ] All input fields are editable
  - [ ] Submit button saves content
  - [ ] Success message displays
  - [ ] Redirects to content library

- [ ] **Edit Existing Content**
  - [ ] Form pre-populates with existing data
  - [ ] Can modify all fields
  - [ ] Submit saves changes
  - [ ] Success message displays

- [ ] **Form Validation**
  - [ ] Required fields show error messages if empty
  - [ ] Cannot submit without title
  - [ ] Cannot submit without stream URL
  - [ ] Year field accepts only numbers

- [ ] **Conditional Fields**
  - [ ] Series checkbox toggles season/episode fields
  - [ ] Season/episode fields hidden when is_series=false
  - [ ] Season/episode fields shown when is_series=true

- [ ] **Publishing Options**
  - [ ] Publish checkbox toggles is_published
  - [ ] Featured checkbox toggles is_featured
  - [ ] Kids content checkbox toggles is_kids_content

- [ ] **Error Handling**
  - [ ] Validation errors display clearly
  - [ ] Server errors show error message
  - [ ] Can retry on error

### 2.3 Categories Page
- [ ] **List Categories**
  - [ ] Shows all categories
  - [ ] Pagination works
  - [ ] Empty state displays when no categories

- [ ] **Create Category**
  - [ ] New button opens inline form
  - [ ] Can enter Hebrew and English names
  - [ ] Can enter slug
  - [ ] Submit creates category
  - [ ] Form closes on success

- [ ] **Edit Category**
  - [ ] Edit button opens category in form
  - [ ] Can modify all fields
  - [ ] Submit updates category

- [ ] **Delete Category**
  - [ ] Delete button shows confirmation
  - [ ] Confirms deletion is required
  - [ ] Category removed from list on success

### 2.4 Live Channels Page
- [ ] **List Channels**
  - [ ] Displays all channels
  - [ ] Shows stream URL, EPG source, order
  - [ ] Empty state when no channels

- [ ] **Create Channel**
  - [ ] Form fields: name, stream_url, epg_source, current_show, order, is_active
  - [ ] Submit creates channel
  - [ ] Form resets on success

- [ ] **Edit Channel**
  - [ ] Pre-populates with existing data
  - [ ] Can modify all fields
  - [ ] Submit updates channel

- [ ] **Delete Channel**
  - [ ] Shows confirmation dialog
  - [ ] Removes channel on confirm

### 2.5 Radio Stations Page
- [ ] **List Stations**
  - [ ] Displays all stations with genre column
  - [ ] Shows stream URL
  - [ ] Empty state when no stations

- [ ] **Create Station**
  - [ ] Can enter name, genre, stream_url, current_show, current_song
  - [ ] Submit creates station

- [ ] **Edit & Delete**
  - [ ] Similar to Live Channels
  - [ ] All fields editable

### 2.6 Podcasts Page
- [ ] **List Podcasts**
  - [ ] Shows podcast title and author
  - [ ] Shows episode count
  - [ ] Empty state when no podcasts

- [ ] **Create Podcast**
  - [ ] Form fields: title, author, description, category, rss_feed, website
  - [ ] Submit creates podcast

- [ ] **Episodes Link**
  - [ ] Music icon button navigates to episodes page
  - [ ] Shows episodes for selected podcast

- [ ] **Edit & Delete**
  - [ ] All fields editable
  - [ ] Deletion confirmed before removing

### 2.7 Podcast Episodes Page
- [ ] **Navigation**
  - [ ] Shows breadcrumb: "Podcasts > Podcast Name > Episodes"
  - [ ] Back button returns to podcasts list

- [ ] **List Episodes**
  - [ ] Shows all episodes
  - [ ] Displays episode number, title, duration, published date
  - [ ] Pagination works

- [ ] **Create Episode**
  - [ ] New button opens form
  - [ ] Form fields: title, description, episode_number, season_number, duration, audio_url, published_at
  - [ ] audio_url is required
  - [ ] Submit creates episode

- [ ] **Edit Episode**
  - [ ] Pre-populates with existing data
  - [ ] Can modify all fields
  - [ ] Submit updates episode

- [ ] **Delete Episode**
  - [ ] Shows confirmation
  - [ ] Removes from list on confirm

### 2.8 Free Content Import Page
- [ ] **Content Type Selector**
  - [ ] 4 buttons: Movies & VOD, Live TV, Radio, Podcasts
  - [ ] Active type is highlighted
  - [ ] Clicking type loads sources for that type

- [ ] **Source Selection**
  - [ ] Shows available sources for selected type
  - [ ] Checkbox to select all items in source
  - [ ] Individual item checkboxes
  - [ ] Item details show (title, description, metadata)

- [ ] **Import Function**
  - [ ] Import button disabled when no items selected
  - [ ] Shows count of selected items
  - [ ] Import button starts import process
  - [ ] Progress bar shows import progress
  - [ ] Success message on completion
  - [ ] Page refreshes to show newly imported content

- [ ] **Error Handling**
  - [ ] Shows error message if import fails
  - [ ] Can retry failed imports

### 2.9 Admin Navigation
- [ ] **Content Menu**
  - [ ] Appears in admin sidebar
  - [ ] Expandable/collapsible
  - [ ] Shows 6 sub-items:
    - [ ] Content Library
    - [ ] Import Content
    - [ ] Categories
    - [ ] Live Channels
    - [ ] Radio Stations
    - [ ] Podcasts
  - [ ] Each item navigates to correct page

### 2.10 Internationalization (i18n)
- [ ] **English**
  - [ ] All text displays in English
  - [ ] Direction is LTR
  - [ ] Form labels are in English

- [ ] **Hebrew**
  - [ ] All text displays in Hebrew
  - [ ] Direction is RTL
  - [ ] Form labels are in Hebrew
  - [ ] Form inputs display correctly in RTL

- [ ] **Language Switching**
  - [ ] Switching language updates all pages
  - [ ] Current navigation items translate

---

## Phase 3: Integration Testing

### 3.1 Complete Workflows

- [ ] **Complete VOD Content Workflow**
  1. [ ] Create category
  2. [ ] Create content with that category
  3. [ ] Upload thumbnail image
  4. [ ] Edit content details
  5. [ ] Publish content
  6. [ ] Feature content
  7. [ ] Search for content
  8. [ ] Unpublish content
  9. [ ] Delete content
  10. [ ] Delete category

- [ ] **Complete Live Channel Workflow**
  1. [ ] Create live channel with stream URL
  2. [ ] Edit channel details
  3. [ ] Update current show
  4. [ ] Delete channel

- [ ] **Complete Podcast Workflow**
  1. [ ] Create podcast
  2. [ ] Create multiple episodes
  3. [ ] Edit episode details
  4. [ ] Delete one episode
  5. [ ] Delete podcast

- [ ] **Import & Edit Workflow**
  1. [ ] Navigate to free content import
  2. [ ] Select content type (VOD)
  3. [ ] Select items from public domain source
  4. [ ] Import items
  5. [ ] Navigate to content library
  6. [ ] Verify imported items appear
  7. [ ] Edit one imported item
  8. [ ] Publish item

### 3.2 Permission Testing
- [ ] **Without content_manager Role**
  - [ ] Cannot access content management pages
  - [ ] API calls return 403 Forbidden

- [ ] **With content_manager Role**
  - [ ] Can access all content pages
  - [ ] Can perform all CRUD operations
  - [ ] Audit logs record all actions

### 3.3 Audit Logging
- [ ] **Verify All Actions Logged**
  - [ ] Create content → CONTENT_CREATED
  - [ ] Update content → CONTENT_UPDATED
  - [ ] Delete content → CONTENT_DELETED
  - [ ] Publish content → CONTENT_PUBLISHED
  - [ ] Unpublish content → CONTENT_UNPUBLISHED
  - [ ] Feature content → Feature toggle recorded
  - [ ] Create category → CATEGORY_CREATED
  - [ ] Similar for live channels, radio stations, podcasts
  - [ ] Import content → CONTENT_IMPORTED

- [ ] **Audit Log Details**
  - [ ] Log shows user who performed action
  - [ ] Log shows timestamp
  - [ ] Log shows resource ID
  - [ ] Log shows changes made (diff)

---

## Phase 4: Performance & Edge Cases

### 4.1 Performance Testing
- [ ] **Large Dataset Handling**
  - [ ] Load 1000+ content items
  - [ ] Pagination performance acceptable
  - [ ] Search performance acceptable
  - [ ] Filter performance acceptable

- [ ] **Concurrent Operations**
  - [ ] Multiple simultaneous content updates don't conflict
  - [ ] Import doesn't block other operations

### 4.2 Edge Cases
- [ ] **Special Characters**
  - [ ] Hebrew text in titles displays correctly
  - [ ] Special characters (quotes, newlines) handled
  - [ ] Emoji support in descriptions

- [ ] **Boundary Values**
  - [ ] Very long titles handled
  - [ ] Very long descriptions handled
  - [ ] Very long URLs handled
  - [ ] Zero duration handled correctly

- [ ] **Network Issues**
  - [ ] Handles slow network gracefully
  - [ ] Shows timeout errors
  - [ ] Allows retry on failure
  - [ ] Doesn't lose form data on error

- [ ] **Missing Data**
  - [ ] Handles content without thumbnail
  - [ ] Handles category without name_en
  - [ ] Handles optional fields missing

---

## Phase 5: Browser & Device Testing

### 5.1 Browser Compatibility
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

### 5.2 Responsive Design
- [ ] Desktop (1920x1080)
- [ ] Tablet (768x1024)
- [ ] Mobile (375x667)
- [ ] Layout adapts correctly
- [ ] Touch targets are appropriate size

### 5.3 RTL Testing (Hebrew)
- [ ] Layout flips correctly
- [ ] Text aligns to right
- [ ] Icons flip if directional
- [ ] Input fields in correct position

---

## Test Execution Summary

### Pre-Testing Setup
```bash
# Ensure backend is running
cd backend
poetry run uvicorn app.main:app --reload

# Ensure frontend is running
cd web
npm run dev

# Create test admin user with content_manager role
curl -X POST http://localhost:8000/admin/users \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Content Manager",
    "email": "content@example.com",
    "password": "test123",
    "role": "content_manager"
  }'
```

### Testing Tools
- **Postman/Thunder Client**: API endpoint testing
- **Browser DevTools**: Frontend debugging
- **Browser Console**: JavaScript error tracking
- **MongoDB Compass**: Database verification
- **Audit Log Review**: Verify all actions logged

### Success Criteria
✅ All CRUD operations work without errors
✅ All pages load and display correctly
✅ All validation works as expected
✅ All error messages display appropriately
✅ RTL/LTR switching works smoothly
✅ Pagination works for all list pages
✅ Permissions properly enforce RBAC
✅ Audit logs record all operations
✅ Free content import works for all sources
✅ No console errors on any page

---

## Known Limitations & Future Improvements

### Current Limitations
1. Image upload uses local storage (S3 optional)
2. Free content sources are test/public only
3. No batch operations support
4. No content scheduling/publishing dates
5. No content versioning/history

### Recommended Future Features
1. Implement S3 storage for production
2. Add content scheduling (publish at specific date/time)
3. Add batch delete/edit operations
4. Add content history/versioning
5. Add content analytics (views, ratings)
6. Add content recommendations
7. Add content relationships (similar items, playlists)
8. Add content translation management
9. Add content validation rules
10. Add webhook integration for live channels

---

## Bug Tracking

### Found Issues (Updated During Testing)
- [ ] Issue #1: Description...
- [ ] Issue #2: Description...
- [ ] Issue #3: Description...

### Fixed Issues
- [x] Issue #0: Initial version completed

---

End of Testing Checklist
