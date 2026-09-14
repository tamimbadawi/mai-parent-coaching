# Mai Website — Agent Rules & System Architecture

This file is the single source of truth for AI agents working on the Mai Website repository. Treat decisions recorded here as settled.

Before starting any task, read `/project-plan/00-INDEX.md` and the relevant subfolder for the feature being worked on. Treat decisions recorded there as settled unless explicitly told to revisit them.

---

## 1. Project Context & Stack

**Repository**: `d:/Cursor/Mai_Website`  
**Package**: `vite-react-typescript-starter`  
**Domain**: Parent coaching / child psychology business website for a practitioner offering coaching, courses, workshops, digital products, community resources, and appointment booking.

### Brand Positioning
- Evidence-based parenting support
- Burnout recovery
- Nervous system healing
- Family coaching
- Calm, warm, trustworthy, premium, professional

### Tech Stack
- **Frontend**: React 18, TypeScript, Vite 5, React Router DOM v7
- **Styling**: Tailwind CSS 3, CSS variables theme system (5 switchable themes in `src/theme.tsx`)
- **Animation**: Framer Motion
- **Icons**: Lucide React
- **Backend & Database**: Supabase Auth, Supabase Postgres, Supabase RLS, Supabase Edge Functions
- **Video Delivery**: Bunny Stream via Edge Functions & `BunnyStreamPlayer`
- **Payments**: PayTabs (Hosted Payment Page, IPN/webhook server-side verification, Edge Functions)
- **Utilities**: `clsx`, `tailwind-merge`, `date-fns`

### Important Source Files
- `src/main.tsx`: Renders App
- `src/App.tsx`: Routes and layout shell
- `src/context/AuthContext.tsx`: Supabase auth, profile, approval status, enrollments
- `src/components/ProtectedRoute.tsx`: Protected routing and role-based redirects
- `src/data/content.ts`: Current static content source
- `src/theme.tsx`: Theme system
- `src/lib/supabase.ts`: Browser Supabase client
- `src/lib/bunny.ts`: Bunny-related helpers
- `src/types/index.ts`: Shared TypeScript interfaces

### Current Feature Status
- **Implemented**: Supabase email/password auth, Google auth, magic link auth, user approval workflow, admin user CRUD via Edge Function, course enrollments in DB, dashboard enrollment reads, admin enrollment reads, admin messages read from `contact_messages`, Bunny Stream admin status/list video integration partially available.
- **Partial**: Video progress tracking, Bunny player delivery for enrolled students.
- **Not fully wired**: Contact form persistence to `contact_messages`, booking persistence to database/calendar, PayTabs checkout for courses/shop, PayTabs/orders admin screen, Blog CMS, Course CMS, Community CMS.

---

## 2. Working Style & Anti-Damage Rules

### Working Style
1. Inspect relevant files first before editing code.
2. Identify the exact existing patterns.
3. Explain briefly which files will be changed and why.
4. Make the smallest safe change; avoid broad rewrites.
5. Prefer production-ready code over demo code.
6. Use existing architecture and conventions; keep behavior consistent across public, dashboard, and admin areas.
7. Prefer explicit TypeScript types (avoid `any` unless there is a clear reason).
8. Do not introduce unnecessary dependencies or duplicate business logic.
9. Reuse existing utilities and components before creating new ones.
10. Never claim a feature is complete if data is only in local state, checkout/booking is unverified/unpersisted, or RLS has been neglected.

### Safe Editing (Anti-Damage)
Never do the following without explicit permission:
- Rewrite the entire app.
- Replace Vite, React, Tailwind, Supabase, or React Router.
- Remove RLS, approval workflows, or admin route protection.
- Replace the theme system or replace `content.ts` with a CMS migration in one step.
- Delete major files or directories, or casually rename core routes / environment variables.
- Expose secret keys or service role keys in frontend code.
- Add large dependency packages without justification.
- Convert working pages into mockups or remove working fallback behavior.

When fixing bugs, locate the root cause and patch the smallest area while preserving UX.

---

## 3. React & TypeScript Guidelines

- Use functional React components with interfaces/types from `src/types/index.ts`.
- Maintain existing route structure in `src/App.tsx`.
- Public routes remain public; student routes must be protected; admin routes require `role === "admin"`.
- Booking route intentionally hides Navbar and Footer.
- Admin route uses `AdminLayout`.
- Course IDs must match `src/data/content.ts` and `course_enrollments.course_id`.
- If moving content to Supabase, do it incrementally and keep fallback behavior until migration is complete.

---

## 4. Supabase & Database Architecture

Supabase is the real backend. Treat database, auth, and RLS changes as security-sensitive.

### Tables & Schema
- `profiles`: Links `id` to `auth.users.id`; holds `role` (`student`/`admin`) and `approval_status` (`pending`/`approved`/`rejected`).
- `course_enrollments`: `course_id` matches static course IDs.
- `video_progress`: Tracks student video progress.
- `contact_messages`: Supports public form submissions and admin reading.
- `admin_notifications`: Powers admin alerts.

### Client & RLS Security
- Browser code may **only** use `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
- Never use `SUPABASE_SECRET_KEY`, service role keys, PayTabs server keys, or Bunny secret keys in the browser.
- Default to deny with RLS; open only what is required.
- Students read only their own enrollments/progress; admins use `is_admin()` helper pattern or Edge Functions.
- All schema modifications must be placed in timestamped migration files under `supabase/migrations`.

---

## 5. Auth, Approval & Admin Flow

- Unauthenticated users redirect to `/auth/login`.
- New users default to `approval_status: pending`.
- Non-approved students redirect to `/auth/pending-approval`.
- Admin users accessing `/dashboard` redirect to `/admin`. Non-admin users accessing `/admin` are redirected away.
- `AuthContext` owns session, user, profile, enrollments, auth methods (`signUp`, `signIn`, `signInWithGoogle`, `signInWithMagicLink`, `signOut`, `updateProfile`, `isEnrolled`, `refreshEnrollments`).
- Admin user management must use `admin-user-manager` Edge Function (never service role key in frontend).
- Students only access their own profile, enrollments, progress, and approved course content they are enrolled in.

---

## 6. UI & Design System

### Brand Aesthetics & Inspiration
- Inspired by Apple, Linear, Notion, and premium wellness/psychology brands.
- Warm, calm, evidence-based, emotionally safe, premium but approachable.
- Generous whitespace as a luxury element; avoid dense layouts and harsh borders.

### Color Tokens & Themes
- Themes: `scandinavian`, `hope`, `boutique`, `nature`, `luxury` (from `src/theme.tsx`).
- Color tokens: `sage`, `cream`, `ivory`, `charcoal`, `terracotta`, `warm white`, `beige`, `soft peach`, `dusty rose`. Avoid neon, harsh black, or aggressive primary colors.

### Layout Hierarchy
1. Emotional hero
2. Trust signal / builder
3. Parent pain point / problem
4. Mai’s approach / solution
5. Services / programs
6. Transformation / outcomes
7. Testimonials
8. About Mai
9. FAQ
10. Final CTA

### Typography & Motion
- Confident headlines (`text-5xl` to `text-6xl` for hero, `text-3xl` to `text-4xl` for sections), short readable paragraphs (`text-base` / `text-lg`).
- Subtle Framer Motion (fade in, slide up, gentle stagger, soft hover lift). Avoid bouncing, spinning, or distracting loops. Respect reduced motion.

---

## 7. Forms and Validation

All forms must include:
- Visible or accessible labels.
- Client-side validation before submit.
- Loading state while submitting and disabled submit button.
- Success and error states tied to real backend operations (never fake success).
- **Contact Form**: Inserts into `contact_messages`, respects RLS, validates required fields.
- **Booking Form**: Persists to appointments/bookings table; captures appointment type, date, time, parent details, child details, status, timestamps.
- **Auth & Profile Forms**: Clear error messaging, preserve redirects, and refresh `AuthContext` on profile update.

---

## 8. Booking System

- Booking flow is focused and distraction-free (Navbar & Footer hidden on `/booking`).
- When wiring booking persistence:
  1. Create bookings/appointments table migration with RLS.
  2. Allow public/user insert; disallow public read.
  3. Store booking details (`id`, `user_id`, `appointment_type_id`, `appointment_type_title`, `appointment_date`, `appointment_time`, `parent_name`, `email`, `phone`, `country`, `child_name`, `child_age`, `notes`, `status`, `created_at`, `updated_at`).
  4. Users read their own bookings; admins read/update all bookings.
  5. Update `AdminBookings` to display confirmed database records.
  6. Do not integrate external calendar integrations until DB persistence is validated.

### Google Calendar Integration
- Real-time availability computed via Google Calendar `freebusy` API queried through Supabase Edge Functions.
- Coach OAuth credentials and refresh tokens must be stored strictly server-side (never in client code).
- Booking confirmations write to both the `bookings` database table and create a Google Calendar event. If calendar event creation fails, persist the booking with status `'pending_calendar_sync'` as fallback.
- Full specifications and architectural details live in `/project-plan/booking/decisions.md`.

---

## 9. Payments (PayTabs)

### Current Status
- Payment gateway: **PayTabs**
- Checkout is not fully wired.
- `AdminOrders` is a placeholder.
- Shop products are static.

### Payment Security Rules
- **Never expose PayTabs server/secret keys in frontend code.**
- Never create trusted orders or grant access from frontend state alone.
- Use Supabase Edge Functions for PayTabs secret operations (creating payment pages, verifying transactions).
- Use PayTabs webhooks / server-to-server callbacks (IPN) to verify and confirm payment server-side before granting access.
- **Never trust a frontend redirect / `return_url` alone** to mark an order paid.

### Recommended Payment Flow
1. User clicks buy/enroll on course or product.
2. Frontend calls Supabase Edge Function.
3. Edge Function validates product/course ID and price server-side against database/content records.
4. Edge Function initiates a PayTabs Hosted Payment Page session and returns the secure payment URL.
5. User is redirected to PayTabs Hosted Payment Page to complete payment.
6. PayTabs server callback / webhook (IPN) notifies the Supabase Edge Function with transaction status and signature verification.
7. Edge Function verifies payment signature, writes order record to database, and creates `course_enrollments` or grants digital product access.
8. Frontend / Dashboard / Admin reads confirmed DB records.

### Admin Orders & Access Control
- `AdminOrders` must read real orders/payments from DB (not frontend state).
- Paid course access requires a confirmed `course_enrollments` record matching `src/data/content.ts` course IDs.
- Digital product delivery requires confirmed server-verified payment.

---

## 10. Bunny Stream Video Delivery

- Integration via `bunny-stream-manager` Edge Function and `BunnyStreamPlayer`.
- Bunny API keys must never be exposed in frontend; all management/signing calls must go through Edge Functions.
- Students should only access enrolled course videos; verify access server-side.
- `BunnyStreamPlayer` must gracefully handle loading, unavailable, locked, and error states without crashing when config is missing.
- Video progress belongs in `video_progress` table; users update only their own progress.

---

## 11. Content & CMS

- `src/data/content.ts` is the current source of truth for static content (services, courses, blog posts, testimonials, FAQ, resources, appointment types, shop products, community posts).
- Do not duplicate content arrays in individual pages.
- Course IDs, blog slugs, and appointment type IDs must remain stable.
- Migration to Supabase CMS must be executed incrementally:
  1. Contact messages
  2. Bookings
  3. Blog posts
  4. Courses & modules/videos
  5. Shop products
  6. Free resources & community posts

---

## 12. Admin Panel

- Routes: `/admin`, `/admin/users`, `/admin/messages`, `/admin/courses`, `/admin/blog`, `/admin/bookings`, `/admin/orders`.
- Uses `AdminLayout` with dedicated sidebar (no public header/footer).
- Admin user CRUD must go through `admin-user-manager` Edge Function.
- All admin screens must display loading, empty, and error states; avoid fake mock data unless explicitly labeled.
- `AdminBookings` and `AdminOrders` must read from real persistent DB tables.

---

## 13. Student Dashboard

- Routes: `/dashboard`, `/dashboard/courses`, `/dashboard/profile`.
- Must require authenticated and approved student status (`approval_status === "approved"`). Pending users are routed to `/auth/pending-approval`.
- Only loads and displays current user's profile, enrollments, and video progress.
- Profile settings update `profiles` table and trigger `AuthContext` refresh.

---

## 14. Supabase Edge Functions

- Functions located in `supabase/functions/` (e.g., `admin-user-manager`, `bunny-stream-manager`, `paytabs-payment-handler`).
- Used for privileged server operations: service-role DB operations, admin auth CRUD, PayTabs payment initiation and callback handling, Bunny API management.
- Security: Validate `Authorization` header, verify user via Supabase auth, verify `profile.role === 'admin'` for admin tasks, never trust frontend role claims, return proper JSON status and CORS headers.

---

## 15. Security & Privacy

- Sensitive parent, child, and family data must be protected with strict privacy.
- Never expose: Supabase service role keys, PayTabs server keys, Bunny API keys, webhook signing secrets, database connection strings.
- Frontend env vars may only include public identifiers (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and public PayTabs client credentials if needed).
- RLS default to deny; public insert does not allow public read.
- Do not log sensitive child or booking details in client consoles or public endpoints.

---

## 16. Performance, SEO & Quality Standards

- Maintain fast load times, optimized assets, and clean bundles.
- Use semantic HTML, structured headings (`h1` hierarchy), accessible ARIA attributes, keyboard navigation, and clear contrast.
- Production readiness: No console spam, no fake success responses, no hardcoded localhost endpoints, robust handling of missing env vars.
