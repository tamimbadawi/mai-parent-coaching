# ⚠️ IMPORTANT: Vercel Environment Variables Setup

Your site is deployed but showing a blank page because **environment variables are not configured** in Vercel.

---

## 🚨 IMMEDIATE ACTION REQUIRED

### Step 1: Go to Your Project Settings
👉 **Direct Link:** https://vercel.com/asacontracting/mai-parent-coaching/settings/environment-variables

Or manually:
1. Go to https://vercel.com/asacontracting
2. Click on **"mai-parent-coaching"** project
3. Click **"Settings"** tab
4. Click **"Environment Variables"** in left sidebar

---

### Step 2: Add These Environment Variables

Click **"Add New"** and enter each one:

#### Variable 1:
- **Key:** `VITE_SUPABASE_URL`
- **Value:** `https://qqnthevakllugdlioalm.supabase.co`
- **Environment:** Select **Production**, **Preview**, **Development** (all three)

#### Variable 2:
- **Key:** `VITE_SUPABASE_ANON_KEY`
- **Value:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFxbnRoZXZha2xsdWdkbGlvYWxtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI1NTE2NTUsImV4cCI6MjA5ODEyNzY1NX0.v1IbgwnuK9gV_WMME1aXrmnJi19Rn2dWV5o141DxBfc`
- **Environment:** Select **Production**, **Preview**, **Development** (all three)

#### Variable 3 (Optional - if you have Stripe):
- **Key:** `VITE_STRIPE_PUBLISHABLE_KEY`
- **Value:** `your_stripe_key_here` (if you have one)
- **Environment:** Select **Production**, **Preview**, **Development** (all three)

---

### Step 3: Redeploy

After adding the environment variables:

1. Go to **"Deployments"** tab
2. Click on the latest deployment
3. Click the **three dots (•••)** menu
4. Select **"Redeploy"**
5. Check **"Use existing Build Cache"** (optional, faster)
6. Click **"Redeploy"**

**OR** just push a new commit to trigger automatic redeployment.

---

## ✅ Expected Result

After redeploying with environment variables, your site should:
- Load the homepage
- Display navigation
- Show all content
- Connect to Supabase successfully

---

## 🔍 How to Verify It Worked

1. Open https://mai-parent-coaching.vercel.app/
2. Open browser console (F12 → Console tab)
3. You should see NO red errors
4. The page should fully load with content

If you see "Missing Supabase environment variables" error, the variables weren't set correctly.

---

## 📱 After Deployment Success

Don't forget to update Supabase redirect URLs:

1. Go to: https://supabase.com/dashboard/project/qqnthevakllugdlioalm/auth/url-configuration
2. Add these URLs:
   - Site URL: `https://mai-parent-coaching.vercel.app`
   - Redirect URLs:
     - `https://mai-parent-coaching.vercel.app/**`
     - `https://mai-parent-coaching.vercel.app/auth/callback`

---

## 🆘 Still Having Issues?

Check the build logs:
1. Go to Deployments tab
2. Click latest deployment
3. Check **"Build Logs"** for errors
4. Check **"Functions"** tab for runtime errors

Common issues:
- Environment variables not saved → Re-add them
- Forgot to redeploy → Trigger a new deployment
- Typo in variable names → Must be EXACT: `VITE_SUPABASE_URL` not `SUPABASE_URL`
