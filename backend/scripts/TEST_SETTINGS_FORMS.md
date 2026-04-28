# Settings Forms CRUD Test Guide

## Prerequisites

1. Ensure backend server is running on `http://localhost:3003`
2. Ensure frontend is running (optional, for manual testing)
3. Reset rate limits if needed: `POST http://localhost:3003/api/v1/auth/reset-rate-limits`

## Automated Testing

Run the automated test script:

```bash
# First, reset rate limits
curl -X POST http://localhost:3003/api/v1/auth/reset-rate-limits

# Wait a few seconds, then run the test
node backend/scripts/test-settings-forms-crud.js
```

## Manual Testing in Browser

### 1. WhatsApp Settings

**Test MetaBusinessAccountForm & WebhookConfigurationForm:**

1. Navigate to Settings → WhatsApp API
2. Fill in:
   - Business Manager ID: `TEST_BUSINESS_ACCOUNT_123`
   - App ID: `TEST_PHONE_NUMBER_456`
   - API Version: `v18.0`
   - Access Token: `TEST_ACCESS_TOKEN_789`
   - Verify Token: `TEST_VERIFY_TOKEN_ABC`
3. Click "Save WhatsApp Settings"
4. Reload the page
5. Verify all fields are populated correctly

### 2. SMS Settings

**Test CustomSMSProviderForm, SMSSenderIDForm, SMSSettingsForm:**

1. Navigate to Settings → SMS API
2. Fill in Custom SMS Provider:
   - API URL: `http://test-sms-api.example.com/submitsms.jsp`
   - API Username: `test_api_user`
   - API Key: `TEST_CUSTOM_API_KEY_XYZ`
   - Entity ID: `TEST_ENTITY_123`
   - Account Usage: `1`
3. Fill in Sender ID: `TEST_SENDER_ID`
4. Configure SMS Settings (checkboxes and dropdowns)
5. Click "Save SMS Settings"
6. Reload the page
7. Verify all fields are populated correctly

### 3. Email Settings

**Test EmailConfigurationForm:**

1. Navigate to Settings → Email API
2. Click "Add Configuration"
3. Fill in:
   - Name: `Test SMTP Configuration`
   - Provider: `SMTP`
   - From Email: `test@example.com`
   - From Name: `Test Sender`
   - SMTP Host: `smtp.test.com`
   - SMTP Port: `587`
   - SMTP Username: `testuser`
   - SMTP Password: `testpassword123`
   - Check "Use secure connection"
   - Check "Verify SSL/TLS Certificate"
   - Set as Default Channel: ✓
   - Status: `Active`
   - Priority: `1`
4. Click "Create Configuration"
5. Verify configuration appears in the table
6. Click Edit icon
7. Update Name to `Updated Test SMTP Configuration`
8. Change Port to `465`
9. Click "Update Configuration"
10. Verify changes are saved
11. Click Delete icon
12. Confirm deletion
13. Verify configuration is removed

### 4. FCM Settings

**Test FCMConfigurationForm:**

1. Navigate to Settings → FCM API
2. Fill in:
   - Firebase Project ID: `TEST_FCM_PROJECT_123`
   - FCM Server Key: `TEST_FCM_SERVER_KEY_XYZ`
3. Click "Save Settings"
4. Reload the page
5. Verify Project ID is populated (Server Key is encrypted, so it won't show)

### 5. Security Settings

**Test TwoFactorAuthForm, IPWhitelistingForm, PasswordSessionForm:**

1. Navigate to Settings → Security & Notifications → Security
2. **Two-Factor Authentication:**
   - Toggle 2FA ON
   - Verify green success message appears
3. **IP Whitelisting:**
   - Toggle IP Whitelisting ON
   - Add IP: `192.168.1.1`
   - Click "+ Add IP Address"
   - Add IP: `10.0.0.1`
4. **Password & Session:**
   - Set Password Expiry: `60` days
   - Set Session Timeout: `2 hours`
5. Click "Save Security Settings"
6. Reload the page
7. Verify:
   - 2FA toggle is ON
   - IP Whitelisting toggle is ON
   - Both IPs are listed
   - Password Expiry is `60`
   - Session Timeout is `2 hours`

### 6. Notification Settings

**Test EmailNotificationsForm, AlertThresholdsForm:**

1. Navigate to Settings → Security & Notifications → Notifications
2. **Email Notifications:**
   - Check/Uncheck various notification options
3. **Alert Thresholds:**
   - Set Failed Message Threshold: `15% failure rate`
   - Set API Error Threshold: `After 50 errors`
4. Click "Save Notification Settings"
5. Reload the page
6. Verify all selections are preserved

## Expected Results

All forms should:
- ✅ Save data successfully
- ✅ Load data correctly after page reload
- ✅ Display validation errors for required fields
- ✅ Handle encrypted fields (tokens, keys) properly
- ✅ Show success/error messages appropriately

## Troubleshooting

If you encounter rate limiting:
1. Wait 1-2 minutes
2. Or reset rate limits: `POST http://localhost:3003/api/v1/auth/reset-rate-limits`
3. Or restart the backend server

If settings don't persist:
1. Check browser console for errors
2. Check backend logs for errors
3. Verify database connection
4. Check that organization ID is correct

