# Custom SMS Provider Configuration - Issue Fix Summary

## Issue Identified
When saving Custom SMS Provider Configuration, the form shows "Configuration saved successfully" but when reloading, all custom provider fields (API URL, API Username, API Key, Entity ID, Account Usage) are blank.

## Root Cause Analysis

### From Browser Console Logs:
1. **Backend Response**: The `customSettings` object in the API response does NOT contain:
   - `customApiUrl`
   - `customApiUser`
   - `customEntityId`
   - `customAccUsage`
   - `customApiKey` (encrypted)

2. **Current `customSettings` contains only**:
   ```json
   {
     "quotaWarnings": true,
     "twilioAccountSid": "<REDACTED_TWILIO_SID>",
     "apiErrorThreshold": "After 100 errors",
     "failedMessageThreshold": "20% failure rate"
   }
   ```

3. **API URL field shows value**: `"http://smsbhejo.org/submitsms.jsp"` - This appears to be a placeholder or default value, not from the database.

## Fixes Applied

### 1. Backend (`backend/src/services/settingsService.js`)

**Issue**: The extraction logic was using `hasOwnProperty` which doesn't work correctly with empty strings or when fields don't exist.

**Fix**:
- Changed from `hasOwnProperty` to `'key' in object` check
- Added proper JSON parsing for `customSettings` (handles both string and object)
- Added type safety checks to ensure `customSettings` is an object
- Improved null/undefined handling

**Code Changes**:
```javascript
// Before
if (customSettings.hasOwnProperty('customApiUrl')) {
  settingsJson.customApiUrl = customSettings.customApiUrl !== null && customSettings.customApiUrl !== undefined 
    ? customSettings.customApiUrl 
    : '';
}

// After
if (customSettings && typeof customSettings === 'object' && !Array.isArray(customSettings)) {
  if ('customApiUrl' in customSettings) {
    settingsJson.customApiUrl = customSettings.customApiUrl != null ? String(customSettings.customApiUrl) : '';
  }
  // ... similar for other fields
}
```

### 2. Frontend (`src/components/tenant/settings/SMSSettings.tsx`)

**Issue**: Field extraction logic was not robust enough to handle all cases.

**Fix**:
- Changed from `!== undefined` checks to `'in'` operator checks
- Added explicit type conversion to strings
- Improved fallback logic (check top-level first, then `customSettings`)
- Added detailed console logging for debugging

**Code Changes**:
```typescript
// Before
const apiUrl = settings.customApiUrl !== undefined ? settings.customApiUrl : (customSettings.customApiUrl !== undefined ? customSettings.customApiUrl : '');

// After
const apiUrl = ('customApiUrl' in settings && settings.customApiUrl !== undefined) 
  ? String(settings.customApiUrl) 
  : (('customApiUrl' in customSettings && customSettings.customApiUrl !== undefined) 
    ? String(customSettings.customApiUrl) 
    : '');
```

### 3. Backend Merge Logic (`backend/src/services/settingsService.js`)

**Issue**: When merging `customSettings`, existing values might be lost if not handled correctly.

**Fix**:
- Improved JSON parsing for existing `customSettings` before merging
- Added type safety checks
- Ensured all custom provider fields are properly merged

## Testing Steps

1. **Navigate to Settings → SMS Settings**
2. **Select "Other" as SMS Provider**
3. **Fill in all fields**:
   - API URL: `http://smsbhejo.org/submitsms.jsp`
   - API Username: `testuser123`
   - API Key: `test-api-key-12345`
   - Entity ID: `TESTENTITY123`
   - Account Usage: `1`
   - Sender ID: `TEST123`
4. **Click "Save SMS Settings"**
5. **Check browser console** for:
   - `SMSSettings - Sending data:` (should show all fields in `customSettings`)
   - `SMSSettings - Save response:` (should show success)
6. **Reload the page (F5)**
7. **Navigate back to Settings → SMS Settings**
8. **Select "Other" as SMS Provider**
9. **Verify all fields are populated** with saved values
10. **Check browser console** for:
    - `SMSSettings - Load response:` (should show `customSettings` with all fields)
    - `SMSSettings - Extracted custom fields:` (should show extracted values)
    - `SMSSettings - Loaded custom provider settings:` (should show final values)

## Expected Console Output After Fix

### On Save:
```json
SMSSettings - Sending data: {
  "smsProvider": "other",
  "smsSenderId": "TEST123",
  "customSettings": {
    "customApiUrl": "http://smsbhejo.org/submitsms.jsp",
    "customApiUser": "testuser123",
    "customEntityId": "TESTENTITY123",
    "customAccUsage": "1"
  },
  "customApiKey": "test-api-key-12345"
}
```

### On Load:
```json
SMSSettings - Load response: {
  "success": true,
  "data": {
    "smsProvider": "other",
    "customSettings": {
      "customApiUrl": "http://smsbhejo.org/submitsms.jsp",
      "customApiUser": "testuser123",
      "customEntityId": "TESTENTITY123",
      "customAccUsage": "1",
      "customApiKey": "***encrypted***"
    },
    "customApiUrl": "http://smsbhejo.org/submitsms.jsp",
    "customApiUser": "testuser123",
    "customEntityId": "TESTENTITY123",
    "customAccUsage": "1"
  }
}
```

## Files Modified

1. `backend/src/services/settingsService.js`
   - Fixed `getOrganizationSettings` method - improved JSON parsing and field extraction
   - Fixed `updateOrganizationSettings` method - improved merge logic

2. `src/components/tenant/settings/SMSSettings.tsx`
   - Fixed `loadSettings` method - improved field extraction logic
   - Added detailed console logging

3. `TEST_CUSTOM_SMS_CRUD.md` (new)
   - Comprehensive test cases document

4. `backend/scripts/test-custom-sms-fix.js` (new)
   - Test script for automated testing

## Next Steps

1. **Test the fix** by following the testing steps above
2. **If fields are still blank**, check:
   - Browser console for detailed logs
   - Backend logs for any errors
   - Database to verify data is being saved
3. **If save is working but load is not**, verify:
   - Backend extraction logic is correct
   - Frontend extraction logic is correct
   - Data format matches expectations

## Known Issues

- The API URL field shows a value even when other fields are blank - this might be a placeholder or default value in the frontend
- Need to verify if the data is actually being saved to the database or if there's an issue with the save operation

