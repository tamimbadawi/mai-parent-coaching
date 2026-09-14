# Mobile App — Architectural Decisions

> [!NOTE]
> All decisions in this file are **settled**. Do not revisit or swap these architectural choices unless explicitly instructed.

---

## 1. Approach: Capacitor Native Wrapper

- **Selected**: Capacitor wrapper around the existing Vite/React/Tailwind web application.
- **Why NOT React Native / Flutter?** A full native rewrite would introduce weeks of redundant development and ongoing maintenance overhead that is not justified for the current business requirements.
- **Not a Separate Product**: The mobile app shares 100% of the core codebase, design system, API integrations, and Supabase backend.

---

## 2. Build Tooling: Google Antigravity IDE

- Google Antigravity IDE is a general-purpose agentic coding environment (not mobile-specific) running standard terminal commands and Capacitor CLI operations.

---

## 3. Build Process: Explicit Multi-Step Protocol

- **Selected**: Strict step-by-step sequential execution with verification checkpoints after each step.
- **Why NOT a single conversion prompt?** Single "convert to mobile app" monolithic prompts make it impossible to isolate breaking changes when encountering platform-specific compilation, signing, or runtime errors on real devices.

---

## 4. Testing & Distribution Strategy

- **iOS**: Apple TestFlight (free beta distribution included with standard Apple Developer account, supports up to 10,000 external testers, installs on physical devices without full App Store review — the mobile equivalent of a Vercel preview deployment).
- **Android**: Direct APK distribution and Google Play Store Internal Testing track.

---

## 5. The Six-Step Build Plan

1. **Step 1 — Install Capacitor**:
   - Install `@capacitor/core` and `@capacitor/cli`.
   - Run `npx cap init` with application name and bundle identifier.
   - *Checkpoint*: Configuration valid, no dependency errors.
2. **Step 2 — Add Native Platforms**:
   - Install `@capacitor/ios` and `@capacitor/android`.
   - Run `npx cap add ios` and `npx cap add android`.
   - *Checkpoint*: `ios/` and `android/` directories created cleanly; `npx cap sync` runs without warnings.
3. **Step 3 — Verify Base Wrap (Crucial Checkpoint)**:
   - Run web production build (`npm run build`), ensure `webDir` points to `dist`, and run `npx cap sync`.
   - Open native project in Xcode / Android Studio simulator.
   - Confirm the live web application renders inside the native shell.
   - *Checkpoint*: Nothing proceeds if this fundamental wrap fails.
4. **Step 4 — Native Feel Adjustments**:
   - Configure safe-area insets (notches, dynamic islands, home bars).
   - Implement Android hardware back-button handler.
   - Disable unwanted mobile browser behaviors (pinch-zoom, bounce-scroll, accidental text selection).
5. **Step 5 — Feature-Specific Device Checks**:
   - Test booking calendar date picker touch responsiveness.
   - Test admin table overflow handling on narrow mobile viewports.
   - Verify Google OAuth sign-in flow (handle in-app browser / webview auth redirects properly).
6. **Step 6 — TestFlight / Internal Testing Build**:
   - Generate release builds for TestFlight and Google Play Internal Testing.
   - Complete physical device testing before public store submission.
