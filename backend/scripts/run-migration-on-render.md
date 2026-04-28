# How to Run Migration on Railway via Render

Since the local environment connects to the old database, the migration needs to be run on Render where Railway environment variables are available.

## Option 1: Run via Render Shell (Recommended)

1. Go to Render Dashboard → Your Backend Service → Shell
2. Run:
```bash
cd /opt/render/project/src/backend
node scripts/migrate-add-processing-status-railway.js
```

## Option 2: Create a Temporary Migration Endpoint

Add this to your backend temporarily:

```javascript
// In backend/src/routes/admin.js or similar
router.post('/migrate/processing-status', async (req, res) => {
  try {
    const migrate = require('../../scripts/migrate-add-processing-status-railway');
    await migrate();
    res.json({ success: true, message: 'Migration completed successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
```

Then call: `POST https://enterprise-messaging-backend.onrender.com/api/v1/admin/migrate/processing-status`

## Option 3: Run SQL Directly on Railway

Connect to Railway MySQL and run:

```sql
ALTER TABLE messages 
MODIFY COLUMN delivery_status ENUM('queued','processing','sent','delivered','read','failed','cancelled') 
DEFAULT 'queued' 
NOT NULL;
```

