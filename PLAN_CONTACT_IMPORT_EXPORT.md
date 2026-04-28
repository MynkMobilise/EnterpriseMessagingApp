# Plan: Contact Import/Export & Auth Error Handling

## Phase 1: Enhanced Auth Error Handling

### 1.1 Frontend API Interceptor Enhancement
- **File**: `src/utils/api.ts`
- **Changes**:
  - Enhance response interceptor to detect "Invalid or expired access token" error messages
  - Check for both 401 status and specific error messages
  - Clear all localStorage items (tokens, organizationId, etc.)
  - Redirect to login page using React Router or window.location
  - Show toast notification about session expiration

### 1.2 Error Message Detection
- Check for error messages containing:
  - "Invalid or expired access token"
  - "Invalid token"
  - "Token expired"
  - "Authentication failed"
- Handle both error.response.data.error.message and error.response.data.message

## Phase 2: Contact Import Enhancement

### 2.1 Backend Template Download Endpoint
- **File**: `backend/src/controllers/contactImportController.js`
- **New Method**: `downloadTemplate`
  - Generate CSV template with headers: name, phoneNumber, email, company, tags, country, city, jobTitle, notes
  - Include sample row for reference
  - Return CSV file with proper headers

- **File**: `backend/src/routes/contacts.js`
- **New Route**: `GET /contacts/import/template`
  - No authentication required (or minimal auth)
  - Returns CSV file download

### 2.2 Backend Import Enhancement
- **File**: `backend/src/services/contactImportService.js`
- **Enhancements**:
  - Support Excel files (.xlsx) in addition to CSV
  - Better error reporting with row numbers
  - Validate phone numbers and emails
  - Support more fields: country, city, jobTitle, notes
  - Return detailed import summary

### 2.3 Frontend Import UI
- **File**: `src/components/tenant/Contacts.tsx`
- **New Features**:
  - "Import Contacts" button in header
  - Modal with:
    - File upload (CSV/Excel)
    - "Download Template" button
    - Import options (skip duplicates, update existing)
    - Progress indicator
    - Import results summary
  - Show import history

## Phase 3: Contact Export

### 3.1 Backend Export Endpoint
- **File**: `backend/src/controllers/contactController.js`
- **New Method**: `exportContacts`
  - Accept filters: search, tags, status, date range
  - Generate CSV/Excel file with all contact fields
  - Use exceljs for Excel export
  - Return file download

- **File**: `backend/src/routes/contacts.js`
- **New Route**: `GET /contacts/export`
  - Accept query parameters for filtering
  - Return Excel file

### 3.2 Frontend Export UI
- **File**: `src/components/tenant/Contacts.tsx`
- **Enhancements**:
  - "Export Contacts" button next to Import
  - Export with current filters applied
  - Show export progress
  - Download file automatically

## Phase 4: Testing

### 4.1 Test Auth Error Handling
- Test with expired token
- Test with invalid token
- Verify logout and redirect

### 4.2 Test Import
- Download template
- Import valid CSV
- Import valid Excel
- Test with duplicates
- Test with invalid data
- Verify error reporting

### 4.3 Test Export
- Export all contacts
- Export with filters
- Verify file format
- Verify data accuracy

## Implementation Order

1. ✅ Phase 1: Auth Error Handling (Critical)
2. ✅ Phase 2: Import Enhancement (Template + UI)
3. ✅ Phase 3: Export (Backend + Frontend)
4. ✅ Phase 4: Comprehensive Testing

