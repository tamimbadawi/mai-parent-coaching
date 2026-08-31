# 🔍 Debug Vercel Deployment - Step by Step

## Current Status
Site URL: https://mai-parent-coaching.vercel.app/
Status: Not opening / Blank page

---

## 🚨 MOST LIKELY CAUSE

**Environment variables are NOT set in Vercel.**

Without these, the React app crashes silently on load.

---

## ✅ SOLUTION - Follow EXACTLY:

### Step 1: Verify Environment Variables

1. **Go to:** https://vercel.com/asacontracting/mai-parent-coaching/settings/environment-variables

2. **You MUST see these TWO variables listed:**
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

3. **If they're NOT there, add them:**

   Click **"Add New"** button:

   **Variable 1:**
   ```
   Name: VITE_SUPABASE_URL
   Value: https://qqnthevakllugdlioalm.supabase.co
   ```
   ✅ Check ALL: Production, Preview, Development
   Click **Save**

   **Variable 2:**
   ```
   Name: VITE_SUPABASE_ANON_KEY
   Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFxbnRoZXZha2xsdWdkbGlvYWxtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI1NTE2NTUsImV4cCI6MjA5ODEyNzY1NX0.v1IbgwnuK9gV_WMME1aXrmnJi19Rn2dWV5o141DxBfc
   ```
   ✅ Check ALL: Production, Preview, Development
   Click **Save**

---

### Step 2: Force Redeploy

**Option A: Trigger from Vercel Dashboard**
1. Go to: https://vercel.com/asacontracting/mai-parent-coaching/deployments
2. Click on the **latest deployment**
3. Click the **three dots (•••)** in top right
4. Select **"Redeploy"**
5. Click **"Redeploy"** button in the popup

**Option B: Trigger from Git (easier)**
```bash
# In your local project folder:
git commit --allow-empty -m "Trigger redeploy"
git push origin main
```

---

### Step 3: Wait and Watch

1. Go to: https://vercel.com/asacontracting/mai-parent-coaching/deployments
2. You'll see a new deployment start (Status: "Building...")
3. Wait 2-3 minutes for it to complete
4. Status should change to: "Ready" with a green checkmark

---

### Step 4: Test the Site

**Test 1: Static Test Page**
Open: https://mai-parent-coaching.vercel.app/test.html

This should ALWAYS work. If this doesn't load, there's a deeper Vercel issue.

**Test 2: Main Homepage**
Open: https://mai-parent-coaching.vercel.app/

This should now show the full homepage with content.

**Test 3: Browser Console**
1. Open the site
2. Press F12 (or right-click → Inspect)
3. Click "Console" tab
4. Look for errors (red text)
5. If you see "Missing Supabase environment variables" → Environment variables weren't set correctly

---

## 🔧 Alternative Diagnostic Steps

### Check Build Logs
1. Go to: https://vercel.com/asacontracting/mai-parent-coaching/deployments
2. Click latest deployment
3. Look at "Build Logs" tab
4. Look for errors in red

### Check Function Logs (Runtime Errors)
1. Same deployment page
2. Click "Functions" tab
3. Look for errors

### Check if Framework is Detected
1. Go to: https://vercel.com/asacontracting/mai-parent-coaching/settings
2. Under "Build & Development Settings"
3. Should show: Framework Preset = "Vite"
4. Build Command = `npm run build` or `vite build`
5. Output Directory = `dist`

If any of these are wrong, click "Override" and set them correctly.

---

## 🆘 If Still Not Working

### Try Hard Refresh
- **Chrome/Edge:** Ctrl + Shift + R (Windows) or Cmd + Shift + R (Mac)
- **Firefox:** Ctrl + F5
- **Safari:** Cmd + Option + R

### Try Incognito/Private Window
Sometimes browser cache causes issues.

### Check Vercel Status
Go to: https://www.vercel-status.com/
Make sure Vercel itself isn't having issues.

### Delete and Reimport Project
Last resort:
1. In Vercel dashboard, delete the project
2. Re-import from GitHub
3. Add environment variables BEFORE first deploy
4. Let it build

---

## 📱 Screenshot Checklist

Can you check these and tell me what you see?

1. Environment Variables page - Are the two variables listed?
2. Latest deployment status - Does it say "Ready" or "Error"?
3. Browser console when visiting the site - Any red errors?
4. Does the test page work? https://mai-parent-coaching.vercel.app/test.html

---

## ✉️ What to Tell Me

If it's still not working, tell me:
1. ✅ or ❌ Environment variables are added
2. ✅ or ❌ Redeployment completed successfully
3. ✅ or ❌ Test page loads (test.html)
4. What error message you see in browser console (if any)
5. Screenshot of the deployment status page
