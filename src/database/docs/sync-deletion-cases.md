# Learning Items Sync: Deletion Cases

## Overview
This document outlines all possible scenarios when syncing learning items between local (IndexedDB) and remote (Firebase) databases, with a focus on deletion handling.

## Key Principle
- **Items with `syncStatus: 'pending'`** are offline-only. Never delete them during sync pulls.
- **Items with `syncStatus: 'synced'`** are already on the server. Safe to delete if they vanish from remote.
- **Items with `syncStatus: 'error'`** failed to upload. Keep them until sync succeeds.

---

## Sync Cases Table

| Case # | Local State | Remote State | Local syncStatus | Action | Output |
|--------|-------------|--------------|------------------|--------|--------|
| 1 | Exists | Exists (newer) | synced | Update local with remote data | Local item updated to remote version |
| 2 | Exists | Exists (older) | synced | Keep local (newer wins) | Local item unchanged |
| 3 | Exists | Does NOT exist | synced | **DELETE** locally | Item removed from local DB |
| 4 | Exists | Does NOT exist | pending | **KEEP** locally | Item remains (offline creation) |
| 5 | Exists | Does NOT exist | error | **KEEP** locally | Item remains (retry needed) |
| 6 | Does NOT exist | Exists | N/A | Add to local | New item created locally from remote |
| 7 | Exists (same) | Exists (same) | synced | No action needed | Item unchanged |
| 8 | Deleted locally | Exists remotely | N/A | Re-add to local | Remote state is source of truth |

---

## Detailed Scenarios

### Case 1: Normal Update (Remote is Newer)
**Setup**: Item created on Computer A, edited on Computer A, Computer B pulls changes
- **Local**: `{id: 'item1', title: 'Old Title', lastModified: '2026-05-20T10:00:00', syncStatus: 'synced'}`
- **Remote**: `{id: 'item1', title: 'New Title', lastModified: '2026-05-27T10:00:00'}`
- **Action**: Compare timestamps → Remote is newer
- **Output**: Local updated to `{id: 'item1', title: 'New Title', lastModified: '2026-05-27T10:00:00', syncStatus: 'synced'}`

### Case 2: Remote Deletion (Item Synced)
**Setup**: Item created and synced on Computer A, deleted on Computer A, Computer B pulls
- **Local**: `{id: 'item2', title: 'Math', syncStatus: 'synced'}`
- **Remote**: ❌ Does not exist
- **Action**: Item has `syncStatus: 'synced'` → safe to delete
- **Output**: Item deleted from local DB completely

### Case 3: Offline Creation (Item Pending)
**Setup**: Computer B creates item offline, then Computer A deletes same item (somehow), Computer B syncs
- **Local**: `{id: 'item3', title: 'Biology', syncStatus: 'pending'}`
- **Remote**: ❌ Does not exist
- **Action**: Item has `syncStatus: 'pending'` → DO NOT delete (offline-only)
- **Output**: Item remains in local DB, will sync when online

### Case 4: Failed Upload (Item in Error State)
**Setup**: Computer B tries to create item, network fails, Computer A deletes it remotely, Computer B syncs
- **Local**: `{id: 'item4', title: 'Physics', syncStatus: 'error'}`
- **Remote**: ❌ Does not exist
- **Action**: Item has `syncStatus: 'error'` → Keep it for retry
- **Output**: Item remains in local DB, can retry sync later

### Case 5: Remote New Item
**Setup**: Computer A creates item online, Computer B pulls before it's created locally
- **Local**: ❌ Does not exist
- **Remote**: `{id: 'item5', title: 'Chemistry', lastModified: '2026-05-27T10:00:00'}`
- **Action**: Pull from remote
- **Output**: Item created in local DB with `{id: 'item5', title: 'Chemistry', syncStatus: 'synced'}`

---

## Implementation Logic

### Pull Phase (After receiving remote items)
```typescript
for (const remoteItem of remoteItems) {
  const localItem = localMap.get(remoteItem.id)
  
  if (localItem?.syncStatus === 'pending') {
    // Case 3: Keep local pending items
    continue
  }
  
  if (!localItem || isAfter(remoteItem.lastModified, localItem.lastModified)) {
    // Case 1 & 5: Update or create
    await updateLocal(remoteItem)
  }
}

// Handle deletions: Check local items that vanished remotely
for (const localItem of localItems) {
  const remoteExists = remoteItems.some(r => r.id === localItem.id)
  
  if (!remoteExists && localItem.syncStatus === 'synced') {
    // Case 2: Safe to delete
    await deleteLocal(localItem.id)
  }
  // Cases 3 & 4: Items with pending/error status are preserved
}
```

---

## Edge Cases

### What if I create an item offline, someone deletes it remotely, then I sync?
- **Result**: Item keeps `syncStatus: 'pending'` → stays local
- **Next**: When you go online, you'll try to upload it → may conflict if remote explicitly forbids duplicates
- **Fix**: Handle in remote `setLearningItem()` — decide: upsert or reject

### What if I edit an item locally while it's being deleted remotely?
- **Result**: Depends on timing of sync pulls vs local edits
- **Best approach**: Last-write-wins based on `lastModified` timestamp

### What if sync fails halfway?
- **Result**: Items with `syncStatus: 'error'` are marked for retry
- **Solution**: `syncEngine` retries on next online event or manual trigger

---

## Testing Checklist

- [ ] Delete item on Computer A, sync Computer B → item disappears from B (Case 2)
- [ ] Create item offline on Computer B, delete on Computer A, sync B → item remains on B (Case 3)
- [ ] Create item on Computer A, sync to B → appears on B (Case 5)
- [ ] Edit item on A, sync to B before A goes offline → B gets new version (Case 1)
- [ ] Create item offline on B, go online, verify it uploads with `syncStatus: 'synced'` (Case 3 → synced)
