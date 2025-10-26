# MongoDB Migration Guide

## Changes Made

The project has been migrated from SQLite to MongoDB Atlas.

### Updated Files

1. **`backend/.env`**
   - Added `MONGODB_URI` with your connection string
   - Added `MONGODB_DB_NAME=aloeshield`
   - Removed `DATABASE_PATH`

2. **`backend/database/database.js`**
   - Replaced SQLite with MongoDB driver
   - Converted all SQL queries to MongoDB operations
   - Updated methods to use async/await

3. **`backend/routes/history.js`**
   - Converted all SQL queries to MongoDB queries
   - Updated pagination logic for MongoDB

4. **`package.json`**
   - Replaced `sqlite3` with `mongodb` package

## Installation Steps

1. **Install MongoDB driver:**
   ```bash
   npm install
   ```

2. **Verify `.env` configuration:**
   ```
   MONGODB_URI=mongodb+srv://christiantapit_db_user:*!Aloe487806!*@aloe-sys-db.xvbslcz.mongodb.net/?retryWrites=true&w=majority&appName=aloe-sys-db
   MONGODB_DB_NAME=aloeshield
   ```

3. **Start the server:**
   ```bash
   npm run dev
   ```

## MongoDB Collections

The database uses the following collections:

- **`analysis_history`** - Stores plant disease analysis results
- **`users`** - User accounts (for future authentication)
- **`user_settings`** - User preferences

## Key Differences from SQLite

1. **No schema migrations needed** - MongoDB is schemaless
2. **Automatic ID generation** - Uses `_id` (ObjectId) instead of auto-increment
3. **Native JSON support** - Arrays and objects stored directly (no JSON.stringify needed)
4. **Date handling** - Uses native Date objects instead of strings
5. **Indexes** - Created automatically on first connection

## Database Connection

The database connection is established when the server starts. If the connection fails, check:

1. MongoDB Atlas IP whitelist (add `0.0.0.0/0` for development)
2. Database user credentials
3. Network connectivity

## Querying Data

MongoDB uses a different query syntax:

**SQLite:**
```sql
SELECT * FROM analysis_history WHERE disease_key = 'healthy' ORDER BY created_at DESC LIMIT 20
```

**MongoDB:**
```javascript
collection.find({ disease_key: 'healthy' })
  .sort({ created_at: -1 })
  .limit(20)
  .toArray()
```

## Security Note

⚠️ **Important:** The `.env` file contains your database password. Make sure:
- `.env` is in `.gitignore`
- Never commit credentials to version control
- Use environment variables in production

## Troubleshooting

### Connection Timeout
- Check MongoDB Atlas network access settings
- Verify the connection string is correct

### Authentication Failed
- Verify username and password in connection string
- Check database user permissions in MongoDB Atlas

### Database Not Found
- MongoDB creates databases automatically on first write
- The database will appear after the first analysis is saved
