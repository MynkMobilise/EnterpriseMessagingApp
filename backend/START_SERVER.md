# Starting the Backend Server

## Quick Start

1. **Create the database** (if not exists):
   ```bash
   node scripts/create-database.js
   ```

2. **Start the server**:
   ```bash
   npm run dev    # Development mode with auto-reload
   # OR
   npm start      # Production mode
   ```

## Server Status

The server will:
- ✅ Connect to MySQL database (172.16.17.68)
- ⚠️  Attempt to connect to Redis (will continue without Redis if unavailable)
- ✅ Create all database tables automatically (development mode)
- ✅ Start on port 3000

## Health Check

Test the server:
```bash
curl http://localhost:3000/health
```

## API Endpoints

Base URL: `http://localhost:3000/api/v1`

### Test Authentication
```bash
# Register
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "organizationSlug": "test-org",
    "email": "test@example.com",
    "password": "SecurePass123!",
    "firstName": "Test",
    "lastName": "User"
  }'
```

## Notes

- Redis is optional - the server will run without it (caching and queue features will be limited)
- Database tables are auto-created in development mode
- Check logs in `logs/` directory for detailed information


