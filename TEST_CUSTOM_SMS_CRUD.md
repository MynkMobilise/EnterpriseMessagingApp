# Custom SMS Provider Configuration - CRUD Test Cases

## Overview
This document outlines comprehensive test cases for Custom SMS Provider Configuration CRUD operations.

## Test Environment Setup
1. Start the backend server: `cd backend && npm start`
2. Start the frontend server: `cd frontend && npm run dev`
3. Login as admin: `admin@example.com` / `Admin123!@#`

## Test Cases

### TEST 1: CREATE - Save Custom SMS Provider Configuration

**Steps:**
1. Navigate to Settings → SMS Settings
2. Select "Other" as SMS Provider
3. Fill in the following fields:
   - API URL: `http://smsbhejo.org/submitsms.jsp`
   - API Username: `testuser123`
   - API Key: `test-api-key-12345`
   - Entity ID (PE ID): `TESTENTITY123`
   - Account Usage: `1`
   - Sender ID: `TEST123`
4. Click "Save SMS Settings"

**Expected Result:**
- ✅ Success toast message: "SMS settings saved successfully"
- ✅ No error messages
- ✅ Console shows: "SMSSettings - Save response" with success: true

**Verification:**
- Open browser console (F12)
- Check for console logs showing the save operation
- Verify the response contains the saved data

---

### TEST 2: READ - Load Custom SMS Provider Configuration

**Steps:**
1. After TEST 1, reload the page (F5)
2. Navigate to Settings → SMS Settings
3. Select "Other" as SMS Provider

**Expected Result:**
- ✅ All form fields are populated with saved values:
  - API URL: `http://smsbhejo.org/submitsms.jsp`
  - API Username: `testuser123`
  - API Key: (should be blank - encrypted, not shown)
  - Entity ID: `TESTENTITY123`
  - Account Usage: `1`
  - Sender ID: `TEST123`

**Verification:**
- Open browser console (F12)
- Check for console logs:
  - "SMSSettings - Load response"
  - "SMSSettings - Provider: other"
  - "SMSSettings - customSettings" (should show all saved fields)
  - "SMSSettings - Extracted custom fields" (should show extracted values)
  - "SMSSettings - Loaded custom provider settings" (should show final values)

**Common Issues:**
- ❌ If fields are blank, check console for:
  - Are values in `customSettings`?
  - Are values extracted to top-level?
  - Are values being set in state?

---

### TEST 3: UPDATE - Modify Custom SMS Provider Configuration

**Steps:**
1. After TEST 2, modify the following fields:
   - API URL: `http://updated-smsbhejo.org/submitsms.jsp`
   - API Username: `updateduser456`
   - API Key: `updated-api-key-67890`
   - Entity ID: `UPDATEDENTITY456`
   - Account Usage: `2`
   - Sender ID: `UPDATED123`
2. Click "Save SMS Settings"

**Expected Result:**
- ✅ Success toast message
- ✅ Settings are saved

**Verification:**
1. Reload the page
2. Navigate to Settings → SMS Settings
3. Select "Other" as SMS Provider
4. Verify all fields show updated values

---

### TEST 4: DELETE - Clear Custom SMS Provider Configuration

**Steps:**
1. Change SMS Provider from "Other" to "Twilio"
2. Click "Save SMS Settings"
3. Reload the page
4. Navigate to Settings → SMS Settings
5. Select "Other" as SMS Provider

**Expected Result:**
- ✅ Form fields are cleared/empty (or show default values)
- ✅ No errors

---

### TEST 5: Edge Cases

#### 5.1 Empty String Values
**Steps:**
1. Save configuration with all fields filled
2. Clear one field (e.g., Entity ID)
3. Save again
4. Reload and verify

**Expected Result:**
- ✅ Empty field should remain empty (not reset to default)

#### 5.2 Special Characters
**Steps:**
1. Enter values with special characters:
   - API URL: `http://test.com/api?param=value&other=123`
   - API Username: `user@domain.com`
   - Entity ID: `TEST-123_ABC`
2. Save and reload

**Expected Result:**
- ✅ All special characters are preserved

#### 5.3 Long Values
**Steps:**
1. Enter very long values (200+ characters)
2. Save and reload

**Expected Result:**
- ✅ Long values are preserved (may be truncated by database constraints)

---

## Browser Console Debugging

### When Fields Are Blank After Reload:

1. **Check Load Response:**
   ```javascript
   // Look for: "SMSSettings - Load response"
   // Verify: response.success === true
   // Verify: response.data.smsProvider === 'other'
   ```

2. **Check customSettings:**
   ```javascript
   // Look for: "SMSSettings - customSettings"
   // Verify: customSettings.customApiUrl exists
   // Verify: customSettings.customApiUser exists
   // Verify: customSettings.customEntityId exists
   ```

3. **Check Extraction:**
   ```javascript
   // Look for: "SMSSettings - Extracted custom fields"
   // Verify: final apiUrl, apiUser, entityId have values
   ```

4. **Check State Setting:**
   ```javascript
   // Look for: "SMSSettings - Loaded custom provider settings"
   // Verify: All values are set correctly
   ```

### Common Issues and Fixes:

**Issue:** Fields are blank after reload
- **Check:** Are values in `customSettings`?
- **Fix:** Backend extraction logic should handle this

**Issue:** Values are in `customSettings` but not extracted
- **Check:** Backend `getOrganizationSettings` method
- **Fix:** Ensure extraction logic uses `'key' in object` check

**Issue:** Values are extracted but not set in form
- **Check:** Frontend `loadSettings` function
- **Fix:** Ensure state setters are called with correct values

---

## API Endpoints Used

- `GET /api/v1/settings/organization` - Get organization settings
- `PUT /api/v1/settings/organization` - Update organization settings

## Database Table

- Table: `organization_settings`
- Column: `custom_settings` (JSON)
- Fields stored:
  - `customApiUrl`
  - `customApiUser`
  - `customApiKey` (encrypted)
  - `customEntityId`
  - `customAccUsage`

## Test Results Template

```
Date: ___________
Tester: ___________

TEST 1 - CREATE: [ ] PASS [ ] FAIL
TEST 2 - READ: [ ] PASS [ ] FAIL
TEST 3 - UPDATE: [ ] PASS [ ] FAIL
TEST 4 - DELETE: [ ] PASS [ ] FAIL
TEST 5.1 - Empty Strings: [ ] PASS [ ] FAIL
TEST 5.2 - Special Characters: [ ] PASS [ ] FAIL
TEST 5.3 - Long Values: [ ] PASS [ ] FAIL

Notes:
_________________________________________________
_________________________________________________
```

