# Session Recording Fix - Backend Integration

## 🐛 Problem

The session replay feature wasn't working properly due to two issues:

1. **Frontend navigation mismatch**: The SessionsPage was navigating with database UUIDs (`session.id`) instead of the actual session ID field (`session.session_id`)
2. **Recording loading not implemented**: SessionReplayPage had mock data and never actually loaded recordings from the backend

## ✅ Solution Implemented

### 1. Fixed Frontend Navigation (SessionsPage.tsx)

**Changed navigation from database UUID to session_id:**

```typescript
// BEFORE (WRONG):
onClick={() => navigate(`/rum/sessions/${session.id}`)}  // Database UUID

// AFTER (CORRECT):
onClick={() => navigate(`/rum/sessions/${session.session_id}`)}  // Session ID field
```

**Why this matters:**
- Backend endpoints expect `session_id` (like "1735689234-abc123")
- S3 recordings are stored using `session_id`: `recordings/{tenant_id}/{session_id}/`
- Database searches use: `WHERE session_id = ?`

### 2. Implemented Recording Loading (SessionReplayPage.tsx)

**Replaced mock data with actual API calls:**

```typescript
const loadRecording = async () => {
  // Load session metadata
  const sessionData = await rumService.getSession(sessionId);

  // Load recording events from backend
  const events = await rumService.getRecordingEvents(sessionId);

  // Calculate duration from events
  const firstEventTime = events[0]?.timestamp || 0;
  const lastEventTime = events[events.length - 1]?.timestamp || 0;
  const calculatedDuration = lastEventTime - firstEventTime;

  setMetadata({
    id: sessionData.id,
    session_id: sessionData.session_id,
    duration_ms: calculatedDuration || sessionData.duration_ms || 0,
    page_views: sessionData.page_view_count,
    interactions: sessionData.event_count,
    errors: sessionData.error_count,
    size_bytes: JSON.stringify(events).length,
    privacy_level: 'strict',
    started_at: sessionData.started_at,
  });

  toast.success(`Recording loaded: ${events.length} events`);
};
```

## 🔄 How Session Continuity Works

### Browser SDK (Already Implemented)

1. **Session Creation** (First Page Load):
   ```typescript
   this.sessionId = this.generateId(); // "1735689234-abc123"
   sessionStorage.setItem('devskin_session_id', this.sessionId);
   ```

2. **Session Resume** (Page Navigation):
   ```typescript
   const existingSessionId = sessionStorage.getItem('devskin_session_id');
   if (existingSessionId) {
     this.sessionId = existingSessionId; // REUSE SAME ID
     return; // Don't create new session
   }
   ```

3. **Recording Events Sent with Same session_id**:
   ```typescript
   this.transport?.sendRecordingEvents(this.sessionId, events);
   ```

### Backend Storage (Already Working)

1. **Events Stored in S3 by session_id**:
   ```
   recordings/{tenant_id}/{session_id}/2025-01-04-12-30-00.json
   recordings/{tenant_id}/{session_id}/2025-01-04-12-35-00.json
   recordings/{tenant_id}/{session_id}/2025-01-04-12-40-00.json
   ```

2. **RecordingStorageService.getRecording()**:
   - Lists all files for `recordings/{tenant_id}/{session_id}/`
   - Loads all JSON files
   - Combines all events into single array
   - Sorts by timestamp for correct playback

### Frontend Display (Now Implemented)

1. **User clicks "Watch Replay"**:
   ```typescript
   navigate(`/rum/sessions/${session.session_id}/replay`)
   ```

2. **SessionReplayPage loads**:
   ```typescript
   // Fetch all events for this session_id
   const events = await rumService.getRecordingEvents(sessionId);

   // Events from multiple pages are already aggregated by backend
   console.log('Total events:', events.length); // All pages combined!
   ```

3. **Result**: One continuous video showing entire user journey

## 📋 Data Flow

```
Page 1 Navigation:
├─ SDK creates session: "1735689234-abc123"
├─ Records events: [FullSnapshot, IncrementalSnapshot, ...]
├─ Sends to backend with session_id: "1735689234-abc123"
└─ Backend saves: recordings/tenant-123/1735689234-abc123/chunk1.json

Page 2 Navigation (Same Tab):
├─ SDK finds session: "1735689234-abc123" (from sessionStorage)
├─ REUSES SAME SESSION ID ✅
├─ Records events: [FullSnapshot, IncrementalSnapshot, ...]
├─ Sends to backend with session_id: "1735689234-abc123" (SAME!)
└─ Backend saves: recordings/tenant-123/1735689234-abc123/chunk2.json

Page 3 Navigation (Same Tab):
├─ SDK finds session: "1735689234-abc123" (from sessionStorage)
├─ REUSES SAME SESSION ID ✅
├─ Records events: [FullSnapshot, IncrementalSnapshot, ...]
├─ Sends to backend with session_id: "1735689234-abc123" (SAME!)
└─ Backend saves: recordings/tenant-123/1735689234-abc123/chunk3.json

User Closes Tab:
├─ pagehide event detected
├─ sessionStorage cleared
└─ Session ended: "1735689234-abc123"

User Opens Replay:
├─ Frontend calls: GET /api/v1/rum/recordings/1735689234-abc123
├─ Backend loads ALL chunks: chunk1.json + chunk2.json + chunk3.json
├─ Backend sorts events by timestamp
├─ Returns: [event1, event2, event3, ..., eventN] (ALL pages combined)
└─ Frontend displays: ONE CONTINUOUS VIDEO ✅
```

## 🎯 Key Points

1. **session_id is the key**: Everything is indexed by the `session_id` field, not database UUID
2. **sessionStorage enables continuity**: Persists during navigation but clears when tab closes
3. **Backend already aggregates**: RecordingStorageService combines all chunks for a session_id
4. **Frontend was the issue**: Wrong ID being passed + not actually loading recordings

## 🚀 Next Steps

To complete the session replay feature:

1. **Install rrweb-player** (optional):
   ```bash
   cd /var/www/html/devskin-monitoramento/packages/frontend
   npm install rrweb-player
   ```

2. **Integrate rrweb-player** (SessionReplayPage.tsx):
   ```typescript
   import('rrweb-player').then(({ default: rrwebPlayer }) => {
     new rrwebPlayer({
       target: document.getElementById('replay-container'),
       props: {
         events: events, // Events already loaded from backend
         width: 1024,
         height: 768,
       },
     });
   });
   ```

3. **Test**:
   - Navigate between multiple pages in the same tab
   - Check that all pages appear in ONE session replay
   - Verify events are in correct chronological order

## 🔍 Debugging

If videos are still separate, check:

```typescript
// 1. Browser Console (during navigation):
[DevSkin] Resuming existing session: 1735689234-abc123  // Should see this on page 2+

// 2. sessionStorage (during navigation):
console.log(sessionStorage.getItem('devskin_session_id')); // Same ID across pages

// 3. Backend logs (when viewing replay):
[RecordingStorageService] Found 3 files in S3  // Should see multiple chunks
[RecordingStorageService] Total events loaded: 450  // All events combined

// 4. Frontend Network tab:
GET /api/v1/rum/recordings/1735689234-abc123
Response: { success: true, data: { events: [...450 events...] } }
```

---

**Date**: 2026-01-04
**Status**: ✅ Backend Integration Complete
**Next**: rrweb-player Integration (Optional)
