# How to Export Database for Railway Migration

Since the database server (172.16.17.68) is on a private network, you need to export it from a machine that has access.

## Option 1: Export from a Server with Database Access

SSH into a server that can access 172.16.17.68, then run:

```bash
mysqldump -h 172.16.17.68 -P 3306 -u sdx_ind_uat_dbadmin -p whatsapp_business_platform \
  --single-transaction \
  --routines \
  --triggers \
  --add-drop-table \
  > export.sql
```

Then download `export.sql` to your local machine.

## Option 2: Export from Your Local Machine (if VPN connected)

If you're connected via VPN:

```bash
cd backend
mysqldump -h 172.16.17.68 -P 3306 -u sdx_ind_uat_dbadmin -p whatsapp_business_platform \
  --single-transaction \
  --routines \
  --triggers \
  --add-drop-table \
  > export.sql
```

## Option 3: Use Database Management Tool

Use MySQL Workbench, phpMyAdmin, or DBeaver to:
1. Connect to 172.16.17.68
2. Export the database
3. Save as `export.sql`

## After Export

Once you have `export.sql` file, place it in the `backend/` directory and run:

```bash
cd backend
node scripts/import-to-railway.js export.sql
```

Or if the file has a different name:

```bash
node scripts/import-to-railway.js path/to/your-export.sql
```

