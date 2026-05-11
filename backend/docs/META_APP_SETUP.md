# Meta App Setup Guide for WhatsApp Business API OAuth Integration

This guide will walk you through setting up a Meta (Facebook) App for WhatsApp Business API OAuth integration.

## Prerequisites

- A Facebook account
- A Meta Business Manager account
- A WhatsApp Business Account (WABA)
- Admin access to the WABA

## Step 1: Create Meta Developer Account

1. Go to [Meta for Developers](https://developers.facebook.com/)
2. Log in with your Facebook account
3. If you don't have a developer account, click "Get Started" and follow the prompts

## Step 2: Create a New App

1. In the Meta for Developers dashboard, click "Create App"
2. Select "Business" as the app type
3. Fill in the app details:
   - **App Name**: Your application name (e.g., "Enterprise Messaging App")
   - **App Contact Email**: Your email address
   - **Business Account**: Select or create a Business Manager account
4. Click "Create App"

## Step 3: Add WhatsApp Product

1. In your app dashboard, find "Add Product" section
2. Click "Set Up" next to "WhatsApp"
3. Follow the setup wizard to configure WhatsApp

## Step 4: Configure OAuth Settings

1. Go to **Settings** > **Basic** in your app dashboard
2. Note your **App ID** and **App Secret** (you'll need these for environment variables)
3. Click "Add Platform" and select "Website"
4. Add your site URL (e.g., `http://localhost:3000` for development)
5. Go to **Products** > **WhatsApp** > **Configuration**
6. Under "Webhooks", note the callback URL format

## Step 5: Configure OAuth Redirect URIs

1. Go to **Settings** > **Basic** in your app dashboard
2. Scroll down to "Valid OAuth Redirect URIs"
3. Add your callback URL:
   - Development: `https://suchna.onmobilise.com/api/v1/whatsapp/oauth/callback`
   - Production: `https://yourdomain.com/api/v1/whatsapp/oauth/callback`
4. Click "Save Changes"

## Step 6: Configure App Permissions

1. Go to **App Review** > **Permissions and Features**
2. Request the following permissions:
   - `whatsapp_business_management` - Manage WhatsApp Business Accounts
   - `whatsapp_business_messaging` - Send and receive WhatsApp messages
3. Submit for review (for production) or use in development mode

## Step 7: Set Up System User (For API Access)

1. Go to [Meta Business Manager](https://business.facebook.com/)
2. Navigate to **Business Settings** > **Users** > **System Users**
3. Click "Add" to create a new system user
4. Name the system user (e.g., "WhatsApp API User")
5. Assign the following permissions:
   - `whatsapp_business_management`
   - `whatsapp_business_messaging`
6. Generate a System User Token:
   - Click "Generate New Token"
   - Select your app
   - Select permissions (same as above)
   - Set expiration (or "Never" for permanent token)
   - Copy the token (you'll use this as the access token in manual configuration)

## Step 8: Link WhatsApp Business Account

1. In Meta Business Manager, go to **WhatsApp Accounts**
2. Ensure your WABA is linked to your Business Manager
3. Verify your phone number in the WABA
4. Note your WABA ID and Phone Number ID

## Step 9: Enable WhatsApp Embedded Signup (Optional but Recommended)

WhatsApp Embedded Signup allows users to create or select WABAs and phone numbers directly within Facebook's OAuth dialog.

1. Go to **Products** > **WhatsApp** > **Getting Started** in your app dashboard
2. Look for "WhatsApp Embedded Signup" section
3. Click "Set Up" or "Configure"
4. Follow the setup wizard to configure embedded signup
5. Note your **Config ID** (you'll need this for environment variables)

**Note:** Embedded Signup may require:
- Business verification (for production)
- App review approval
- Specific app permissions

If embedded signup is not available, you can still use the standard OAuth flow.

## Step 10: Configure Environment Variables

Add the following to your `backend/.env` file:

```env
META_APP_ID=your_app_id_here
META_APP_SECRET=your_app_secret_here
META_REDIRECT_URI=https://suchna.onmobilise.com/api/v1/whatsapp/oauth/callback
META_EMBEDDED_SIGNUP_CONFIG_ID=your_config_id_here  # Optional: Only if embedded signup is enabled
FRONTEND_URL=http://localhost:3000
BACKEND_URL=https://suchna.onmobilise.com  # For webhook URLs
```

For production:

```env
META_APP_ID=your_app_id_here
META_APP_SECRET=your_app_secret_here
META_REDIRECT_URI=https://yourdomain.com/api/v1/whatsapp/oauth/callback
META_EMBEDDED_SIGNUP_CONFIG_ID=your_config_id_here  # Optional: Only if embedded signup is enabled
FRONTEND_URL=https://yourdomain.com
BACKEND_URL=https://yourdomain.com  # For webhook URLs
```

**Note:** `META_EMBEDDED_SIGNUP_CONFIG_ID` is optional. If not set, the system will use the standard OAuth flow.

## Step 11: Business Verification (Required for Production)

1. Go to **Business Settings** > **Security** > **Business Verification**
2. Submit required business documents
3. Wait for Meta's review (can take several days)
4. Once verified, your app can be used in production

## Important Notes

- **Development Mode**: In development mode, only app admins, developers, and test users can use the OAuth flow
- **App Review**: For production use, you must submit your app for review
- **Embedded Signup**: Provides a seamless experience but requires additional configuration. Falls back to standard OAuth if not configured.
- **Rate Limits**: Meta has rate limits on API calls. Monitor your usage
- **Token Expiration**: Long-lived tokens expire in 60 days. The system automatically refreshes them
- **Webhook Auto-Configuration**: After linking a WABA, the system automatically configures webhooks. Ensure `BACKEND_URL` is set correctly.
- **Security**: Never commit your App Secret to version control. Use environment variables

## Troubleshooting

### OAuth Redirect URI Mismatch
- Ensure the redirect URI in your app settings exactly matches the one in your `.env` file
- Check for trailing slashes and protocol (http vs https)

### Invalid OAuth State
- OAuth state tokens expire after 10 minutes
- If you see this error, try the OAuth flow again

### Token Exchange Failed
- Verify your App ID and App Secret are correct
- Check that your app is in the correct mode (development/production)
- Ensure required permissions are granted

### No WABAs Found
- Verify your Facebook account has access to a WABA
- Check that the WABA is linked to your Business Manager
- Ensure you've granted the `whatsapp_business_management` permission

## Support

For more information, refer to:
- [Meta for Developers Documentation](https://developers.facebook.com/docs/)
- [WhatsApp Business API Documentation](https://developers.facebook.com/docs/whatsapp)
- [Graph API Reference](https://developers.facebook.com/docs/graph-api)

