# Supabase VS Code Setup Guide

## ✅ What's Already Done
- ✓ Supabase CLI added to `package.json`
- ✓ Database npm scripts configured
- ✓ `supabase/config.toml` configured
- ✓ `.env` template created

## 📋 Next Steps

### 1. Install Dependencies
```powershell
npm install
```

### 2. Get Your Supabase Credentials
- Go to [Supabase Dashboard](https://app.supabase.com)
- Select your project
- Go to **Settings → API** (left sidebar)
- Copy the following values:
  - **Project URL** → `SUPABASE_URL`
  - **Anon public key** → `SUPABASE_ANON_KEY` and `VITE_SUPABASE_ANON_KEY`
  - **Service role secret** → `SUPABASE_SERVICE_ROLE_KEY`

### 3. Update `.env` File
Edit `.env` in the root directory and paste your credentials:
```
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
```

### 4. Link Your Supabase Project
```powershell
npx supabase link --project-ref your-project-ref
```

## 🛠️ Available Commands

### Development Database
```powershell
# Start local Supabase instance
npm run db:start

# Stop local Supabase instance
npm run db:stop

# Reset database to initial state
npm run db:reset
```

### Database Migrations
```powershell
# Push local migrations to production
npm run db:push

# Pull latest migrations from production
npm run db:pull
```

## 📝 Making Changes

### Local Development
1. Make changes in VS Code
2. Run `npm run db:start` to start local DB
3. Test changes locally
4. When ready, run `npm run db:push` to sync with production

### Via Supabase Studio
While `npm run db:start` is running:
- Supabase Studio is available at `http://localhost:54323`
- Make changes in the web UI
- Changes will be reflected in your local database

### Creating Migrations
```powershell
# Create a new migration
npx supabase migration new migration_name

# Make your SQL changes in supabase/migrations/
# Then push to production:
npm run db:push
```

## 📂 File Structure

```
supabase/
├── config.toml          # Local CLI configuration
├── migrations/          # SQL migration files
│   ├── 20260627_create_user_profiles.sql
│   └── 20260627_create_contact_messages.sql
├── functions/           # Edge Functions
│   └── hello-supabase/
├── schema.sql          # Full schema reference
└── sql/                # SQL utility scripts
    └── test_connection_rls.sql
```

## 🔐 Security Notes
- **Never commit `.env`** - it contains secret credentials
- `.env` is already in `.gitignore`
- Only share credentials with authorized team members
- Rotate keys if they're ever exposed

## 📚 Useful Resources
- [Supabase CLI Docs](https://supabase.com/docs/guides/cli)
- [Supabase Local Development](https://supabase.com/docs/guides/local-development)
- [SQL Migrations](https://supabase.com/docs/guides/migrations)

## ❓ Troubleshooting

### "npx supabase" not found
```powershell
npm install
```

### Can't connect to Supabase
1. Check `.env` file has correct credentials
2. Run `npm run db:start` for local testing
3. Verify credentials in [Supabase Dashboard](https://app.supabase.com)

### Port Already in Use
If local DB won't start (port 54322 in use):
```powershell
# Kill the process on that port or change port in supabase/config.toml
```
