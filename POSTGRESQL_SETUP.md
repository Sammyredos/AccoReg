# PostgreSQL Setup Guide for AccoReg Local Development

## 1. Install PostgreSQL

### Windows
1. Download the installer from [PostgreSQL Downloads](https://www.postgresql.org/download/windows/)
2. Run the installer and follow the setup wizard
3. Remember the password you set for the postgres user
4. Keep the default port (5432)
5. Complete the installation

### macOS
```bash
# Using Homebrew
brew install postgresql@15
brew services start postgresql@15
```

### Linux (Ubuntu/Debian)
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

## 2. Create a Database for AccoReg

### Windows
1. Open pgAdmin (installed with PostgreSQL)
2. Connect to your server (right-click and enter password)
3. Right-click on "Databases" and select "Create" → "Database"
4. Name it "accoreg" and save

### Command Line (All Platforms)
```bash
# Login as postgres user
sudo -u postgres psql

# Create database
CREATE DATABASE accoreg;

# Create a user (replace 'mypassword' with a secure password)
CREATE USER accoreg_user WITH ENCRYPTED PASSWORD 'mypassword';

# Grant privileges
GRANT ALL PRIVILEGES ON DATABASE accoreg TO accoreg_user;

# Exit
\q
```

## 3. Update Environment Variables

Create or update your `.env.local` file with:

```
# PostgreSQL Connection
DATABASE_URL="postgresql://accoreg_user:mypassword@localhost:5432/accoreg"
```

## 4. Migrate Your Data

### Option 1: Using Prisma Migrate
```bash
# Generate migration files
npx prisma migrate dev --name init

# Apply migrations
npx prisma migrate deploy
```

### Option 2: Using Database Backup/Import
1. Create a backup from your SQLite database
2. Import it into PostgreSQL using the AccoReg backup/import tool

## 5. Verify Connection

```bash
# Generate Prisma client
npx prisma generate

# Check database connection
npx prisma db pull
```

## 6. Start Your Application

```bash
npm run dev
```

## Troubleshooting

### Connection Issues
- Verify PostgreSQL is running: `pg_isready`
- Check credentials in `.env.local`
- Ensure firewall allows connections to port 5432

### Migration Issues
- Clear Prisma cache: `npx prisma migrate reset`
- Check migration logs: `.prisma/migrations`

### Performance Tuning
Edit `postgresql.conf` (location varies by platform) to optimize:
- `shared_buffers`: 25% of RAM
- `work_mem`: 4-8MB per connection
- `maintenance_work_mem`: 64MB
- `effective_cache_size`: 75% of RAM

## PostgreSQL vs SQLite

| Feature | PostgreSQL | SQLite |
|---------|------------|--------|
| Performance | Better for concurrent users | Better for single user |
| Scalability | Excellent | Limited |
| Features | Full SQL compliance | Subset of SQL |
| Setup | More complex | Simple |
| Production-ready | Yes | Limited |
| Memory usage | Higher | Lower |

## Backup & Restore

### Backup
```bash
pg_dump -U accoreg_user -d accoreg -f accoreg_backup.sql
```

### Restore
```bash
psql -U accoreg_user -d accoreg -f accoreg_backup.sql
```
