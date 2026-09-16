# 🚀 QUICK START - Fix Your Blank Page NOW

Your site is deployed but blank because it needs environment variables. Here's the fastest way to fix it:

---

## ⚡ 3-STEP FIX (5 Minutes)

### 1️⃣ Open Vercel Environment Variables
Click this link:  
👉 **https://vercel.com/asacontracting/mai-parent-coaching/settings/environment-variables**

### 2️⃣ Click "Add New" and Add These:

**First Variable:**
```
Key:   VITE_SUPABASE_URL
Value: https://qqnthevakllugdlioalm.supabase.co
```
✅ Check: Production, Preview, Development (all three)  
Click **"Save"**

**Second Variable:**
```
Key:   VITE_SUPABASE_ANON_KEY
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFxbnRoZXZha2xsdWdkbGlvYWxtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI1NTE2NTUsImV4cCI6MjA5ODEyNzY1NX0.v1IbgwnuK9gV_WMME1aXrmnJi19Rn2dWV5o141DxBfc
```
✅ Check: Production, Preview, Development (all three)  
Click **"Save"**

### 3️⃣ Wait for Auto-Redeploy
Vercel will automatically redeploy in 1-2 minutes. Watch the "Deployments" tab.

---

## ✅ Done!

Your site should now work at: **https://mai-parent-coaching.vercel.app/**

---

## 🔐 Bonus: Enable Login/Signup

After the site loads, update Supabase:

1. Go to: https://supabase.com/dashboard/project/qqnthevakllugdlioalm/auth/url-configuration
2. Set **Site URL** to: `https://mai-parent-coaching.vercel.app`
3. Add to **Redirect URLs**:
   - `https://mai-parent-coaching.vercel.app/**`
   - `https://mai-parent-coaching.vercel.app/auth/callback`
4. Click **Save**

---

## 📚 More Info

- Full deployment guide: `DEPLOYMENT.md`
- Detailed troubleshooting: `VERCEL_ENV_SETUP.md`
- If stuck: `FIX_BLANK_PAGE.md`

---

**Go do it now!** ⚡
