# Infrastructure — Status

## Current Status: Live & Operational

---

## What's Built

- **GitHub Actions Keep-Alive Workflow**:
  - Located at [`.github/workflows/supabase-keep-alive.yml`](file:///d:/Cursor/Mai_Website/.github/workflows/supabase-keep-alive.yml).
  - Pings Supabase's `/auth/v1/health` endpoint on a scheduled cron every 3 days (`0 8 */3 * *`).
  - Automatically prevents the Supabase free-tier project from pausing due to the 7-day inactivity rule.
  - Authenticates using two repository secrets (`SUPABASE_URL` and `SUPABASE_ANON_KEY`) securely stored in GitHub repository settings.
  - Does **not** use or require the privileged Service Role Key.
  - Confirmed working as of **September 14, 2026**, with a successful manual workflow dispatch returning HTTP `200`.

---

## Known Limitations & Production Path

- **Free-Tier Workaround**: This automated keep-alive ping is a development/staging workaround to maintain project availability during low-traffic periods.
- **Production Recommendation**: When the project transitions to live production with paying clients and active appointment traffic, upgrading to **Supabase Pro ($25/mo)** is recommended. Supabase Pro eliminates inactivity pausing natively, provides automated backups, and removes the need for synthetic ping workflows.
