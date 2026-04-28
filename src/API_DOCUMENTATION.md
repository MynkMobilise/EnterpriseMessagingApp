# 📡 Complete API Documentation
## WhatsApp Business API Platform - RESTful Endpoints

---

## 📋 Table of Contents

1. [API Overview](#api-overview)
2. [Authentication](#authentication)
3. [Organizations API](#organizations-api)
4. [Users API](#users-api)
5. [Contacts API](#contacts-api)
6. [Templates API](#templates-api)
7. [Messages API](#messages-api)
8. [Settings API](#settings-api)
9. [API Keys API](#api-keys-api)
10. [Reports API](#reports-api)

---

## API Overview

### Base URL
```
http://localhost:3000/api/v1
```

### Response Format
All API responses follow this structure:

#### Success Response
```json
{
  "success": true,
  "data": {
    // Response data
  },
  "message": "Optional success message"
}
```

#### Error Response
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {}
  }
}
```

### Common HTTP Status Codes
- `200 OK` - Request successful
- `201 Created` - Resource created successfully
- `204 No Content` - Request successful, no content to return
- `400 Bad Request` - Invalid request data
- `401 Unauthorized` - Authentication required
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `409 Conflict` - Resource conflict (duplicate)
- `422 Unprocessable Entity` - Validation error
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server error

---

## Authentication

### Register User

**POST** `/api/v1/auth/register`

Register a new user account.

**Request Body:**
```json
{
  "organizationSlug": "acme-corp",
  "email": "john.doe@acme.com",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe",
  "phoneNumber": "+1234567890"
}
```

**Validation Rules:**
- `email`: Required, valid email format
- `password`: Min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char
- `firstName`: Required, 2-100 chars
- `lastName`: Required, 2-100 chars
- `phoneNumber`: Optional, E.164 format

**Success Response (201):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "john.doe@acme.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "operator",
      "status": "pending"
    },
    "message": "Registration successful. Please check your email to verify your account."
  }
}
```

---

### Login

**POST** `/api/v1/auth/login`

Authenticate user and receive JWT tokens.

**Request Body:**
```json
{
  "email": "john.doe@acme.com",
  "password": "SecurePass123!",
  "organizationSlug": "acme-corp"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "john.doe@acme.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "admin",
      "organizationId": "org-uuid",
      "organizationName": "Acme Corporation",
      "permissions": {
        "canSendMessages": true,
        "canApproveMessages": true,
        "canManageUsers": true
      }
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "expiresIn": 3600
    }
  }
}
```

---

### Refresh Token

**POST** `/api/v1/auth/refresh`

Get new access token using refresh token.

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 3600
  }
}
```

---

### Verify Email

**POST** `/api/v1/auth/verify-email`

Verify user email with token.

**Request Body:**
```json
{
  "token": "email-verification-token"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Email verified successfully"
}
```

---

### Forgot Password

**POST** `/api/v1/auth/forgot-password`

Request password reset link.

**Request Body:**
```json
{
  "email": "john.doe@acme.com",
  "organizationSlug": "acme-corp"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Password reset link sent to your email"
}
```

---

### Reset Password

**POST** `/api/v1/auth/reset-password`

Reset password with token.

**Request Body:**
```json
{
  "token": "reset-token",
  "newPassword": "NewSecurePass123!"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Password reset successfully"
}
```

---

## Organizations API

### Create Organization

**POST** `/api/v1/organizations`

Create a new organization.

**Authentication:** Required (Super Admin only)

**Request Body:**
```json
{
  "name": "Acme Corporation",
  "slug": "acme-corp",
  "industry": "E-commerce",
  "plan": "professional",
  "email": "admin@acme.com",
  "phone": "+1234567890",
  "maxUsers": 20,
  "maxMessagesPerMonth": 10000
}
```

**Success Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Acme Corporation",
    "slug": "acme-corp",
    "plan": "professional",
    "status": "trial",
    "trialEndsAt": "2024-04-15T00:00:00Z",
    "createdAt": "2024-03-15T10:30:00Z"
  }
}
```

---

### Get Organization

**GET** `/api/v1/organizations/:id`

Get organization details.

**Authentication:** Required

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Acme Corporation",
    "slug": "acme-corp",
    "industry": "E-commerce",
    "plan": "professional",
    "status": "active",
    "maxUsers": 20,
    "maxMessagesPerMonth": 10000,
    "usedMessages": 2450,
    "email": "admin@acme.com",
    "phone": "+1234567890",
    "website": "https://acme.com",
    "createdAt": "2024-03-15T10:30:00Z",
    "updatedAt": "2024-03-20T15:45:00Z"
  }
}
```

---

### List Organizations

**GET** `/api/v1/organizations`

List all organizations (filtered by permissions).

**Authentication:** Required

**Query Parameters:**
- `page` (number, default: 1)
- `limit` (number, max: 100, default: 20)
- `status` (enum: active, trial, suspended, cancelled)
- `plan` (enum: starter, professional, enterprise)
- `search` (string)

**Example:**
```
GET /api/v1/organizations?page=1&limit=20&status=active&search=acme
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "organizations": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "name": "Acme Corporation",
        "slug": "acme-corp",
        "plan": "professional",
        "status": "active",
        "usedMessages": 2450,
        "maxMessagesPerMonth": 10000,
        "createdAt": "2024-03-15T10:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "totalPages": 3
    }
  }
}
```

---

### Update Organization

**PUT** `/api/v1/organizations/:id`

Update organization details.

**Authentication:** Required (Admin/Super Admin)

**Request Body:**
```json
{
  "name": "Acme Corporation LLC",
  "industry": "Technology",
  "email": "contact@acme.com",
  "website": "https://www.acme.com"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Acme Corporation LLC",
    "updatedAt": "2024-03-21T09:15:00Z"
  }
}
```

---

### Delete Organization

**DELETE** `/api/v1/organizations/:id`

Soft delete organization.

**Authentication:** Required (Super Admin only)

**Success Response (204):**
```
No Content
```

---

## Users API

### Create User

**POST** `/api/v1/users`

Create a new user (by admin).

**Authentication:** Required (Admin/Super Admin)

**Request Body:**
```json
{
  "email": "jane.smith@acme.com",
  "firstName": "Jane",
  "lastName": "Smith",
  "role": "manager",
  "phoneNumber": "+1234567890",
  "department": "Marketing",
  "jobTitle": "Marketing Manager"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "user-uuid",
    "email": "jane.smith@acme.com",
    "firstName": "Jane",
    "lastName": "Smith",
    "role": "manager",
    "status": "pending",
    "createdAt": "2024-03-15T10:30:00Z"
  }
}
```

---

### List Users

**GET** `/api/v1/users`

List all users in organization.

**Authentication:** Required

**Query Parameters:**
- `page` (number, default: 1)
- `limit` (number, max: 100, default: 20)
- `role` (enum: super_admin, admin, manager, operator, viewer)
- `status` (enum: active, inactive, suspended, pending)
- `search` (string)

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "user-uuid",
        "email": "john.doe@acme.com",
        "firstName": "John",
        "lastName": "Doe",
        "role": "admin",
        "status": "active",
        "department": "IT",
        "jobTitle": "IT Manager",
        "lastLoginAt": "2024-03-20T15:30:00Z",
        "createdAt": "2024-01-15T10:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 42,
      "totalPages": 3
    }
  }
}
```

---

### Get User

**GET** `/api/v1/users/:id`

Get user details.

**Authentication:** Required

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "user-uuid",
    "email": "john.doe@acme.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "admin",
    "status": "active",
    "phoneNumber": "+1234567890",
    "department": "IT",
    "jobTitle": "IT Manager",
    "permissions": {
      "canSendMessages": true,
      "canApproveMessages": true,
      "canManageUsers": true
    },
    "lastLoginAt": "2024-03-20T15:30:00Z",
    "createdAt": "2024-01-15T10:00:00Z"
  }
}
```

---

### Update User

**PUT** `/api/v1/users/:id`

Update user details.

**Authentication:** Required (Admin/Super Admin or self for limited fields)

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "phoneNumber": "+1234567890",
  "department": "Operations",
  "jobTitle": "Operations Manager"
}
```

**Admin can also update:**
```json
{
  "role": "admin",
  "status": "active"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "user-uuid",
    "firstName": "John",
    "lastName": "Doe",
    "updatedAt": "2024-03-21T09:15:00Z"
  }
}
```

---

### Delete User

**DELETE** `/api/v1/users/:id`

Soft delete user.

**Authentication:** Required (Admin/Super Admin)

**Success Response (204):**
```
No Content
```

---

## Contacts API

### Create Contact

**POST** `/api/v1/contacts`

Create a new contact.

**Authentication:** Required

**Request Body:**
```json
{
  "phoneNumber": "+1234567890",
  "name": "John Doe",
  "email": "john.doe@example.com",
  "company": "Acme Corp",
  "jobTitle": "CEO",
  "tags": ["vip", "customer"],
  "customFields": {
    "customerId": "CUST-12345",
    "lifetimeValue": 15000
  }
}
```

**Success Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "contact-uuid",
    "phoneNumber": "+1234567890",
    "name": "John Doe",
    "email": "john.doe@example.com",
    "status": "active",
    "optInStatus": "pending",
    "tags": ["vip", "customer"],
    "createdAt": "2024-03-15T10:30:00Z"
  }
}
```

---

### List Contacts

**GET** `/api/v1/contacts`

List all contacts.

**Authentication:** Required

**Query Parameters:**
- `page`, `limit`
- `status` (active, inactive, blocked, unsubscribed)
- `tags` (comma-separated)
- `search` (name/email/phone)
- `groupId` (filter by group)

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "contacts": [
      {
        "id": "contact-uuid",
        "phoneNumber": "+1234567890",
        "name": "John Doe",
        "email": "john.doe@example.com",
        "company": "Acme Corp",
        "status": "active",
        "optInStatus": "opted_in",
        "tags": ["vip", "customer"],
        "totalMessagesSent": 45,
        "createdAt": "2024-03-15T10:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 1234,
      "totalPages": 25
    }
  }
}
```

---

### Import Contacts (CSV)

**POST** `/api/v1/contacts/import`

Import contacts from CSV file.

**Authentication:** Required

**Content-Type:** `multipart/form-data`

**Form Data:**
- `file`: CSV file
- `skipDuplicates`: boolean
- `updateExisting`: boolean
- `defaultTags`: array of tags

**CSV Format:**
```csv
phoneNumber,name,email,company,tags
+1234567890,John Doe,john@example.com,Acme Corp,"vip,customer"
```

**Success Response (202):**
```json
{
  "success": true,
  "data": {
    "importId": "import-uuid",
    "status": "processing",
    "message": "Import started. You'll be notified when complete."
  }
}
```

---

### Bulk Operations

**POST** `/api/v1/contacts/bulk`

Perform bulk operations on contacts.

**Authentication:** Required

**Request Body:**
```json
{
  "action": "add_tags",
  "contactIds": ["uuid1", "uuid2", "uuid3"],
  "data": {
    "tags": ["new-tag"]
  }
}
```

**Actions:** `add_tags`, `remove_tags`, `update_status`, `delete`

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "updatedCount": 3,
    "failedCount": 0
  }
}
```

---

## Templates API

### Create Template

**POST** `/api/v1/templates`

Create a new message template.

**Authentication:** Required

**Request Body:**
```json
{
  "name": "Order Confirmation",
  "channel": "whatsapp",
  "category": "transactional",
  "language": "en",
  "body": "Hello {{customer_name}}, your order #{{order_id}} has been confirmed! Expected delivery: {{delivery_date}}",
  "footer": "Reply STOP to unsubscribe",
  "headerType": "text",
  "headerContent": "Order Confirmed ✓",
  "variables": [
    {"name": "customer_name", "type": "text", "required": true},
    {"name": "order_id", "type": "text", "required": true},
    {"name": "delivery_date", "type": "date", "required": true}
  ],
  "buttons": [
    {"type": "quick_reply", "text": "Track Order"},
    {"type": "url", "text": "View Order", "url": "https://example.com/orders/{{order_id}}"}
  ],
  "tags": ["ecommerce", "orders"]
}
```

**Success Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "template-uuid",
    "name": "Order Confirmation",
    "channel": "whatsapp",
    "category": "transactional",
    "status": "draft",
    "variableCount": 3,
    "createdAt": "2024-03-15T10:30:00Z"
  }
}
```

---

### List Templates

**GET** `/api/v1/templates`

List all templates.

**Query Parameters:**
- `channel` (whatsapp, sms, both)
- `status` (draft, pending_approval, approved, rejected, archived)
- `category` (marketing, transactional, utility, authentication)

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "templates": [
      {
        "id": "template-uuid",
        "name": "Order Confirmation",
        "channel": "whatsapp",
        "category": "transactional",
        "status": "approved",
        "variableCount": 3,
        "totalSent": 15420,
        "lastUsedAt": "2024-03-20T15:30:00Z",
        "createdAt": "2024-03-15T10:30:00Z"
      }
    ]
  }
}
```

---

### Submit Template for Approval

**POST** `/api/v1/templates/:id/submit`

Submit template for approval.

**Authentication:** Required

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "template-uuid",
    "status": "pending_approval",
    "message": "Template submitted for approval"
  }
}
```

---

### Approve/Reject Template

**POST** `/api/v1/templates/:id/approve`

Approve or reject template.

**Authentication:** Required (Admin/Manager)

**Request Body (Approve):**
```json
{
  "action": "approve"
}
```

**Request Body (Reject):**
```json
{
  "action": "reject",
  "reason": "Template content doesn't comply with policies"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "template-uuid",
    "status": "approved",
    "approvedBy": "user-uuid",
    "approvedAt": "2024-03-15T11:00:00Z"
  }
}
```

---

## Messages API

### Send Single Message

**POST** `/api/v1/messages/send`

Send a single message.

**Authentication:** Required

**Request Body (Text Message):**
```json
{
  "channel": "whatsapp",
  "recipientPhone": "+1234567890",
  "recipientName": "John Doe",
  "messageType": "text",
  "content": "Hello John! Your order has been shipped.",
  "priority": "normal",
  "category": "transactional",
  "scheduledFor": "2024-03-15T14:00:00Z"
}
```

**Request Body (Template Message):**
```json
{
  "channel": "whatsapp",
  "recipientPhone": "+1234567890",
  "messageType": "template",
  "templateId": "template-uuid",
  "variables": {
    "customer_name": "John",
    "order_id": "ORD-12345",
    "delivery_date": "March 20, 2024"
  },
  "priority": "high"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "message-uuid",
    "approvalStatus": "pending",
    "deliveryStatus": "queued",
    "expiresAt": "2024-03-16T10:30:00Z",
    "message": "Message submitted for approval"
  }
}
```

---

### Send Bulk Messages

**POST** `/api/v1/messages/bulk`

Send bulk messages.

**Authentication:** Required

**Request Body:**
```json
{
  "name": "March Newsletter",
  "channel": "whatsapp",
  "templateId": "template-uuid",
  "recipients": [
    {
      "phone": "+1234567890",
      "variables": {"name": "John", "order_id": "ORD-001"}
    },
    {
      "phone": "+0987654321",
      "variables": {"name": "Jane", "order_id": "ORD-002"}
    }
  ],
  "priority": "normal",
  "scheduledFor": "2024-03-15T14:00:00Z"
}
```

**Success Response (202):**
```json
{
  "success": true,
  "data": {
    "batchId": "batch-uuid",
    "totalRecipients": 2,
    "status": "pending",
    "message": "Bulk messages submitted for approval"
  }
}
```

---

### List Pending Approvals

**GET** `/api/v1/messages/approvals`

List messages pending approval.

**Authentication:** Required (Manager/Admin)

**Query Parameters:**
- `status` (pending, approved, rejected, expired)
- `priority` (low, normal, high, urgent)

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "messages": [
      {
        "id": "message-uuid",
        "submittedBy": {
          "id": "user-uuid",
          "name": "John Doe"
        },
        "recipientPhone": "+1234567890",
        "recipientName": "Jane Smith",
        "content": "Hello Jane! Your order...",
        "priority": "high",
        "category": "marketing",
        "approvalStatus": "pending",
        "submittedAt": "2024-03-15T10:30:00Z",
        "expiresAt": "2024-03-16T10:30:00Z"
      }
    ],
    "stats": {
      "totalPending": 45,
      "urgent": 3,
      "high": 12,
      "normal": 28,
      "low": 2
    }
  }
}
```

---

### Approve Message

**POST** `/api/v1/messages/:id/approve`

Approve a message for sending.

**Authentication:** Required (Manager/Admin)

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "message-uuid",
    "approvalStatus": "approved",
    "deliveryStatus": "queued",
    "approvedBy": "user-uuid",
    "approvedAt": "2024-03-15T11:00:00Z",
    "message": "Message approved and queued for sending"
  }
}
```

---

### Reject Message

**POST** `/api/v1/messages/:id/reject`

Reject a message.

**Authentication:** Required (Manager/Admin)

**Request Body:**
```json
{
  "reason": "Message content violates company policy"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "message-uuid",
    "approvalStatus": "rejected",
    "rejectedBy": "user-uuid",
    "rejectedAt": "2024-03-15T11:00:00Z",
    "rejectionReason": "Message content violates company policy"
  }
}
```

---

### Bulk Approve

**POST** `/api/v1/messages/bulk-approve`

Approve multiple messages at once.

**Authentication:** Required (Manager/Admin)

**Request Body:**
```json
{
  "messageIds": ["uuid1", "uuid2", "uuid3"]
}
```

Or approve all pending:
```json
{
  "approveAllPending": true
}
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "approvedCount": 3,
    "failedCount": 0,
    "queuedForSending": 3
  }
}
```

---

### Get Message Status

**GET** `/api/v1/messages/:id`

Get detailed message status.

**Authentication:** Required

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "message-uuid",
    "recipientPhone": "+1234567890",
    "content": "Hello...",
    "approvalStatus": "approved",
    "deliveryStatus": "delivered",
    "sentAt": "2024-03-15T11:05:00Z",
    "deliveredAt": "2024-03-15T11:05:30Z",
    "readAt": "2024-03-15T11:10:00Z",
    "events": [
      {
        "eventType": "sent",
        "occurredAt": "2024-03-15T11:05:00Z"
      },
      {
        "eventType": "delivered",
        "occurredAt": "2024-03-15T11:05:30Z"
      },
      {
        "eventType": "read",
        "occurredAt": "2024-03-15T11:10:00Z"
      }
    ]
  }
}
```

---

## Settings API

### Get Organization Settings

**GET** `/api/v1/settings/organization`

Get organization settings.

**Authentication:** Required

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "organizationId": "org-uuid",
    "whatsappBusinessAccountId": "1234567890",
    "whatsappPhoneNumberId": "0987654321",
    "requireMessageApproval": true,
    "defaultMessageExpiryHours": 24,
    "emailNotifications": true,
    "twoFactorRequired": false,
    "companyLogoUrl": "https://cdn.example.com/logo.png",
    "brandColor": "#3B82F6"
  }
}
```

---

### Update Organization Settings

**PUT** `/api/v1/settings/organization`

Update organization settings.

**Authentication:** Required (Admin/Super Admin)

**Request Body:**
```json
{
  "whatsappBusinessAccountId": "1234567890",
  "whatsappPhoneNumberId": "0987654321",
  "requireMessageApproval": true,
  "defaultMessageExpiryHours": 48,
  "emailNotifications": true
}
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    // updated settings
  }
}
```

---

### Get User Preferences

**GET** `/api/v1/settings/preferences`

Get user preferences.

**Authentication:** Required

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "userId": "user-uuid",
    "theme": "dark",
    "language": "en",
    "timezone": "America/New_York",
    "emailNotifications": true,
    "desktopNotifications": true
  }
}
```

---

### Update User Preferences

**PUT** `/api/v1/settings/preferences`

Update user preferences.

**Authentication:** Required

**Request Body:**
```json
{
  "theme": "dark",
  "language": "en",
  "timezone": "America/New_York",
  "emailNotifications": false
}
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    // updated preferences
  }
}
```

---

## API Keys API

### Create API Key

**POST** `/api/v1/api-keys`

Create a new API key.

**Authentication:** Required (Admin/Super Admin)

**Request Body:**
```json
{
  "name": "Production API Key",
  "environment": "production",
  "scopes": ["messages:send", "messages:read", "templates:read"],
  "rateLimitPerMinute": 100,
  "rateLimitPerDay": 50000,
  "expiresAt": "2025-03-15T00:00:00Z",
  "description": "Main production key for web application"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "key-uuid",
    "name": "Production API Key",
    "key": "EXAMPLE_PLACEHOLDER_API_KEY_DO_NOT_USE",
    "keyPrefix": "sk_live_",
    "keyHint": "wxyz",
    "environment": "production",
    "scopes": ["messages:send", "messages:read", "templates:read"],
    "rateLimitPerMinute": 100,
    "rateLimitPerDay": 50000,
    "status": "active",
    "expiresAt": "2025-03-15T00:00:00Z",
    "createdAt": "2024-03-15T10:30:00Z"
  },
  "warning": "Please save this key securely. It will not be shown again."
}
```

---

### List API Keys

**GET** `/api/v1/api-keys`

List all API keys.

**Authentication:** Required

**Query Parameters:**
- `environment` (production, development, staging)
- `status` (active, inactive, revoked)

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "apiKeys": [
      {
        "id": "key-uuid",
        "name": "Production API Key",
        "keyPrefix": "sk_live_",
        "keyHint": "wxyz",
        "environment": "production",
        "status": "active",
        "lastUsedAt": "2024-03-20T15:30:00Z",
        "totalRequests": 125430,
        "createdAt": "2024-03-15T10:30:00Z",
        "expiresAt": "2025-03-15T00:00:00Z"
      }
    ]
  }
}
```

---

### Revoke API Key

**POST** `/api/v1/api-keys/:id/revoke`

Revoke an API key.

**Authentication:** Required (Admin/Super Admin)

**Request Body:**
```json
{
  "reason": "Security breach - rotating keys"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "key-uuid",
    "status": "revoked",
    "revokedAt": "2024-03-20T16:00:00Z",
    "revokedReason": "Security breach - rotating keys"
  }
}
```

---

## Reports API

### Message Volume Report

**GET** `/api/v1/reports/message-volume`

Get message volume statistics.

**Authentication:** Required

**Query Parameters:**
- `startDate` (YYYY-MM-DD)
- `endDate` (YYYY-MM-DD)
- `channel` (whatsapp, sms, all)

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "totalSent": 45230,
    "totalDelivered": 44501,
    "totalRead": 38765,
    "totalFailed": 729,
    "deliveryRate": 98.4,
    "readRate": 87.1,
    "dailyBreakdown": [
      {
        "date": "2024-03-01",
        "sent": 1520,
        "delivered": 1495,
        "read": 1320
      }
    ]
  }
}
```

---

### Template Performance Report

**GET** `/api/v1/reports/template-performance`

Get template performance statistics.

**Authentication:** Required

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "templates": [
      {
        "templateId": "template-uuid",
        "templateName": "Order Confirmation",
        "totalSent": 15420,
        "deliveryRate": 99.2,
        "readRate": 89.5,
        "clickRate": 23.6,
        "avgResponseTime": "4.5 minutes"
      }
    ]
  }
}
```

---

**API Documentation Complete** ✅
**Total Endpoints**: 60+
**Authentication**: JWT Bearer Token
**Rate Limiting**: Configurable per endpoint
**Ready for Implementation** 🚀
