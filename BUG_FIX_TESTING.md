# Bug Fix Testing Guide

## Issue #1: Camera/Video Streaming Not Working ❌ → ✅ DEBUGGING ENABLED

### Root Cause
Agora remote video tracks may not be subscribing properly due to:
1. Network issues in subscribe operation
2. Missing video tracks after subscription
3. Component key mismatch between Agora UID and Django user_id

### Debug Implementation
Added comprehensive console logging in:

#### Room.tsx (Main live component)
- **Line 489**: `syncRemoteVideoTrack()` - Logs when video tracks are added/removed
- **Line 523**: `subscribeRemoteUser()` - Logs subscription start, success, and errors
- **Line 712**: Initial subscription scan - Logs all subscription results and errors

#### StudentGridSection.tsx 
- **useEffect hook**: Logs videoTracks Map keys and participant user_ids for comparison

#### StudentTile.tsx
- **useEffect hook**: Logs when video track is played or when render falls back to avatar

#### SidePanel.tsx
- **SidebarMiniVideo component**: Logs when video plays or fails

### Testing Steps

1. **Open Live Class**
   - Open browser DevTools (F12)
   - Go to Console tab
   - Join a live lesson as student

2. **Monitor Logs**
   - Look for `[Room]`, `[StudentGridSection]`, `[StudentTile]`, `[SidePanel]` prefixed logs
   - Key logs to check:
     - `"Initial subscribe results"` - Should show successful subscriptions
     - `"Video track synced"` - Should appear for each participant
     - `"Playing video track"` - Should appear in StudentTile when video renders

3. **Identify Issues**
   - If `"Initial subscribe errors"` appears: Subscribe failed (network/permission issue)
   - If `"videoTracks keys"` is empty: No tracks received from Agora
   - If `"Playing video track"` doesn't appear: Video track rendering issue

### Expected Behavior (After Fix)
```
[Room] Initial subscribe results: {total: 5, succeeded: 5}
[Room] Video track synced: {remoteUid: "123", label: "video subscribed", hasTrack: true}
[StudentTile] Playing video track: {studentId: 123, trackType: 'PlayableVideoTrack'}
```

### Troubleshooting
- **All logs empty?** - Check Agora SDK initialization: `AgoraRTC.enableLogUpload()`
- **Subscribe errors?** - Check Agora permissions and token validity
- **No video in browser?** - Check browser camera permissions and firewall rules

---

## Issue #2: Admin Registration Approval Not Working ❌ → ✅ IMPLEMENTED

### Solution
Created new `/api/accounts/admin/approve-user/` endpoint that:
1. Validates user exists
2. Sets user role (student/teacher/admin)
3. For students: assigns group and creates StudentProfile
4. For teachers: creates TeacherSubject mappings for provided subjects
5. Logs audit trail

### Backend Files Modified

**`backend/accounts/serializers.py`**
- Added `ApproveUserSerializer` for validation

**`backend/accounts/views.py`**
- Added `ApproveUserView` (POST endpoint)

**`backend/accounts/urls.py`**
- Added route: `path('admin/approve-user/', ApproveUserView.as_view())`

**`frontend/src/api/admin.ts`**
- Added `approveUser()` function with `ApproveUserPayload` type

### API Endpoint

**URL**: `POST /api/accounts/admin/approve-user/`

**Authentication**: Required (admin or superuser only)

**Request Body**:
```json
{
  "user_id": 123,
  "role": "student",
  "group_id": 1,
  "subject_ids": []
}
```

**Roles**:
- `"student"` - Requires `group_id`
- `"teacher"` - Requires `subject_ids` (list of subject IDs)
- `"admin"` - No additional fields needed

### Testing Steps

#### Using cURL
```bash
# As admin user, get auth token first
curl -X POST http://localhost:8000/api/accounts/login/ \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "password"}' | jq .

# Use the token from response to approve user
TOKEN="<paste_access_token_here>"

# Approve as student
curl -X POST http://localhost:8000/api/accounts/admin/approve-user/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": 50,
    "role": "student",
    "group_id": 1,
    "subject_ids": []
  }'

# Approve as teacher
curl -X POST http://localhost:8000/api/accounts/admin/approve-user/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": 51,
    "role": "teacher",
    "group_id": null,
    "subject_ids": [1, 2, 3]
  }'
```

#### Using Frontend Admin Panel
```typescript
import { approveUser } from '@/api/admin';

// In component
const handleApproveStudent = async (userId: number, groupId: number) => {
  try {
    const result = await approveUser({
      user_id: userId,
      role: 'student',
      group_id: groupId,
      subject_ids: []
    });
    console.log('User approved:', result);
  } catch (error) {
    console.error('Approval failed:', error);
  }
};
```

### Expected Response
```json
{
  "detail": "Foydalanuvchi muvaffaqiyatli ma'qullandi.",
  "user_id": 123,
  "role": "student",
  "group_id": 1,
  "subject_ids": []
}
```

### Error Responses

**400 Bad Request** - Missing required fields
```json
{"group_id": "Talaba uchun guruh belgilash majburiy."}
```

**404 Not Found** - User or group not found
```json
{"detail": "Foydalanuvchi topilmadi."}
```

**403 Forbidden** - Not admin
```json
{"detail": "Faqat admin bajarishi mumkin."}
```

### Integration with Admin Panel

To integrate approval into the Users.tsx admin page:

1. **Add approval button to table actions**:
```tsx
{
  title: "Amallar",
  key: "actions",
  render: (_: unknown, user: AdminUser) => (
    user.role === "pending" && (
      <Button 
        size="small"
        onClick={() => handleApproveUser(user.id)}
      >
        Ma'qullash
      </Button>
    )
  ),
}
```

2. **Call approve endpoint**:
```tsx
const handleApproveUser = async (userId: number) => {
  const groupId = await selectGroup(); // Show modal
  await approveUser({
    user_id: userId,
    role: 'student',
    group_id: groupId,
  });
  // Refresh users list
};
```

### Audit Trail
All approvals are logged to AuditLog with:
- Action: `"user_approved"`
- Approved user ID
- Assigned role
- Assigned group/subject IDs
- Admin who performed approval

---

## Testing Checklist

### Camera/Video Streaming
- [ ] Open live class with 2+ participants
- [ ] Check browser console for debug logs
- [ ] Verify video renders in participant grid
- [ ] Verify video renders in side panel (desktop)
- [ ] Test with multiple participants
- [ ] Check for "Video track synced" logs
- [ ] Monitor for subscribe errors

### Admin Approval
- [ ] Approve student with group assignment
- [ ] Verify StudentProfile created with correct group
- [ ] Approve teacher with subject assignment
- [ ] Verify TeacherSubject records created
- [ ] Check audit log entries
- [ ] Verify permissions restriction (admin only)
- [ ] Test error cases (missing group, invalid subject)

---

## Status: READY FOR TESTING ✅

All backend endpoints implemented and tested locally.
Debug logging added to frontend for camera/video issues.
Ready for production deployment after testing.
