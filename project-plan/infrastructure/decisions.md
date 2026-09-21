# Infrastructure — Architectural Decisions

> [!NOTE]
> All decisions in this file are **settled**. Treat these choices as settled context for future maintenance and security reviews.

---

## 1. Keep-Alive Mechanism: GitHub Actions vs. pg_cron

- **Selected**: Scheduled workflow via GitHub Actions (`.github/workflows/supabase-keep-alive.yml`).
- **Rationale**:
  - **Visibility of Failures**: A failing GitHub Actions run displays immediately as a prominent red status indicator in the repository's **Actions** tab and can send email alerts upon failure.
  - In contrast, a failed `pg_cron` job in Supabase fails silently in background database logs, easily going unnoticed until the database actually becomes inactive and pauses.

---

## 2. Security & Credentials: Anon Key vs. Service Role Key

- **Selected**: Public anonymous key (`SUPABASE_ANON_KEY`) only.
- **Rationale**: The Supabase `/auth/v1/health` endpoint requires only the standard `apikey` gateway header to validate and register inbound traffic. No administrative or database-level permissions are required for a health-check ping. Elevated service role permissions are intentionally excluded from the workflow.

---

## 3. Security History Note (Context)

> [!IMPORTANT]
> **Context for Future Reference**:
> During initial environment configuration, the Supabase `SUPABASE_SERVICE_ROLE_KEY` was briefly exposed when pasted into an external context (an AI chat conversation). A deliberate decision was made not to rotate it at that time.
>
> This is recorded here for audit and visibility purposes rather than as an active blocking defect, ensuring future development sessions are aware of the project's credential history if database security or credential audits arise.

---

## 4. Version Control of Server & Reverse-Proxy Configurations

- **Selected**: All manual or SSH-applied VM configuration changes (e.g. Nginx sites-available configs, Docker host overrides, firewall rules) must have an exact equivalent version-controlled file committed under `infrastructure/` (e.g. `infrastructure/nginx/whatsapp-reverse-proxy.conf`).
- **Rationale**: Server configurations applied solely via SSH drift silently from the repository over time. Version-controlling exact host configurations ensures reproducible infrastructure, transparent auditing, and rapid recovery if VMs are reprovisioned.

