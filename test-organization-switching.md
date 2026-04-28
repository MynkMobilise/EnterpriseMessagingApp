# Organization Switching Test Results

## Test Plan

### Phase 4: Testing Organization Switching

#### Prerequisites
1. Backend server running on port 3003
2. Frontend server running on port 3000 (or configured port)
3. Database connected and seeded with test data
4. At least 2 organizations in the database
5. SuperAdmin user: `admin@example.com` / `Admin123!@#`

#### Test Scenarios

### Test 1: SuperAdmin Organization Switching ✅

**Steps:**
1. Login as SuperAdmin (`admin@example.com`)
2. Navigate to any page (Dashboard, Templates, Contacts, etc.)
3. Note the current organization data displayed
4. Click on organization switcher in header
5. Select a different organization
6. Verify all pages update with new organization's data

**Expected Results:**
- ✅ Organization switcher shows all available organizations
- ✅ Switching organization updates localStorage (`organizationId` and `currentOrganizationId`)
- ✅ All pages automatically refresh
- ✅ Dashboard shows new organization's statistics
- ✅ Templates page shows new organization's templates
- ✅ Contacts page shows new organization's contacts
- ✅ All API calls include `X-Organization-Id` header with correct value

**Manual Test Checklist:**
- [ ] Login as SuperAdmin
- [ ] Verify organization switcher shows multiple organizations
- [ ] Switch to Organization A
- [ ] Verify Dashboard shows Organization A's data
- [ ] Switch to Organization B
- [ ] Verify Dashboard shows Organization B's data
- [ ] Check browser Network tab - verify `X-Organization-Id` header in API calls
- [ ] Test on Templates page - verify templates change per organization
- [ ] Test on Contacts page - verify contacts change per organization
- [ ] Test on Message Logs page - verify messages change per organization
- [ ] Test on User Management page - verify users change per organization

### Test 2: Regular User Security ✅

**Steps:**
1. Login as a regular user (non-super_admin role)
2. Verify organization switcher only shows their own organization
3. Attempt to manually set `X-Organization-Id` header to different organization (via browser DevTools)
4. Verify backend rejects the request with 403 Forbidden

**Expected Results:**
- ✅ Regular users only see their own organization in switcher
- ✅ Regular users cannot access other organizations
- ✅ Backend validates organization access and returns 403 for unauthorized access
- ✅ Frontend handles 403 errors gracefully

**Manual Test Checklist:**
- [ ] Login as regular user (e.g., operator role)
- [ ] Verify organization switcher shows only one organization
- [ ] Verify all pages show only their organization's data
- [ ] (Optional) Use browser DevTools to modify `X-Organization-Id` header
- [ ] Verify API returns 403 Forbidden
- [ ] Verify frontend shows appropriate error message

### Test 3: API Header Verification ✅

**Steps:**
1. Open browser DevTools → Network tab
2. Login as SuperAdmin
3. Switch organizations
4. Monitor API requests
5. Verify `X-Organization-Id` header is present and correct

**Expected Results:**
- ✅ All API requests include `X-Organization-Id` header
- ✅ Header value matches selected organization ID
- ✅ Header updates when organization is switched
- ✅ Backend processes header correctly

**Manual Test Checklist:**
- [ ] Open browser DevTools → Network tab
- [ ] Login and switch organizations
- [ ] Check API request headers
- [ ] Verify `X-Organization-Id` header is present
- [ ] Verify header value changes when organization switches
- [ ] Verify backend responds with correct organization's data

### Test 4: Component Refresh Verification ✅

**Steps:**
1. Login as SuperAdmin
2. Navigate to each major page
3. Switch organizations
4. Verify each page refreshes automatically

**Pages to Test:**
- [ ] Dashboard (HomeDashboard)
- [ ] Templates
- [ ] Contacts
- [ ] Message Logs
- [ ] Approval Center
- [ ] Media Library
- [ ] User Management
- [ ] Role Management
- [ ] MIS Reports
- [ ] Settings (all tabs)
- [ ] Send Message

**Expected Results:**
- ✅ All pages have `currentOrganization?.id` in useEffect dependencies
- ✅ Pages automatically refetch data when organization changes
- ✅ No stale data from previous organization
- ✅ Loading states show during data refresh

### Test 5: Edge Cases ✅

**Scenarios:**
1. Switch organization while data is loading
2. Switch organization multiple times quickly
3. Switch organization while on a page with unsaved changes
4. Refresh page after switching organization
5. Logout and login - verify organization persists

**Expected Results:**
- ✅ No race conditions or data mixing
- ✅ React handles rapid organization switches gracefully
- ✅ Unsaved changes are preserved (if applicable)
- ✅ Organization selection persists after page refresh
- ✅ Organization selection persists after logout/login

## Implementation Verification

### Backend Changes ✅
- [x] `backend/src/middleware/auth.js` - Reads `X-Organization-Id` header
- [x] SuperAdmin can access any organization
- [x] Regular users validated against their organization
- [x] All controllers use `req.organizationId`

### Frontend Changes ✅
- [x] `src/contexts/OrganizationContext.tsx` - Syncs localStorage keys
- [x] `src/utils/api.ts` - Sends `X-Organization-Id` header
- [x] All components updated with `currentOrganization?.id` dependency
- [x] Organization switcher updates both localStorage keys

## Test Execution

**To run automated tests:**
```bash
cd backend
node scripts/test-organization-switching.js
```

**To run manual tests:**
1. Start backend: `cd backend && npm start`
2. Start frontend: `npm run dev`
3. Open browser: `http://localhost:3000`
4. Follow test scenarios above

## Test Results

**Date:** [To be filled after testing]
**Tester:** [To be filled]
**Environment:** Development

### Test 1: SuperAdmin Organization Switching
- Status: ⏳ Pending
- Notes: 

### Test 2: Regular User Security
- Status: ⏳ Pending
- Notes: 

### Test 3: API Header Verification
- Status: ⏳ Pending
- Notes: 

### Test 4: Component Refresh Verification
- Status: ⏳ Pending
- Notes: 

### Test 5: Edge Cases
- Status: ⏳ Pending
- Notes: 

## Issues Found

[List any issues found during testing]

## Conclusion

[Summary of test results and overall status]

