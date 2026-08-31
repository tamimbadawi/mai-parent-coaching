# 🚀 READY TO DEPLOY!

Your project is ready for Vercel deployment. Follow these simple steps:

---

## 🎯 DEPLOY NOW (5 Minutes)

### Step 1: Go to Vercel
👉 **Open:** https://vercel.com/asacontracting

### Step 2: Create New Project
1. Click **"Add New"** button (top right)
2. Select **"Project"**

### Step 3: Import Repository
1. Click **"Import Git Repository"**
2. Find and select: **`tamimbadawi/mai-parent-coaching`**
3. Click **"Import"**

### Step 4: Configure Project
Vercel will auto-detect everything, just verify:
- ✅ Framework Preset: **Vite**
- ✅ Build Command: **`npm run build`**
- ✅ Output Directory: **`dist`**
- ✅ Install Command: **`npm install`**

### Step 5: Add Environment Variables
Click **"Environment Variables"** and add these **ONE BY ONE**:

**Name:** `VITE_SUPABASE_URL`  
**Value:** `https://qqnthevakllugdlioalm.supabase.co`

**Name:** `VITE_SUPABASE_ANON_KEY`  
**Value:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFxbnRoZXZha2xsdWdkbGlvYWxtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI1NTE2NTUsImV4cCI6MjA5ODEyNzY1NX0.v1IbgwnuK9gV_WMME1aXrmnJi19Rn2dWV5o141DxBfc`

(Add others if you have Stripe keys, etc.)

### Step 6: Deploy!
1. Click **"Deploy"** button
2. Wait 2-3 minutes for build to complete
3. You'll get a live URL like: `https://your-project-name.vercel.app`

---

## ⚠️ IMPORTANT: After First Deployment

### Update Supabase URLs (REQUIRED for Auth to work)

1. **Go to:** https://supabase.com/dashboard/project/qqnthevakllugdlioalm/auth/url-configuration

2. **Add your Vercel URL to:**
   - **Site URL:** `https://your-project-name.vercel.app`
   - **Redirect URLs:** Add:
     ```
     https://your-project-name.vercel.app/**
     https://your-project-name.vercel.app/auth/callback
     ```

3. Click **"Save"**

---

## ✅ That's It!

Your site will be live and will auto-deploy whenever you push to GitHub!

🔗 **Your Dashboard:** https://vercel.com/asacontracting

---

## 📱 What You Get:

✅ Free HTTPS certificate  
✅ Global CDN (super fast)  
✅ Auto-deployments from GitHub  
✅ Preview URLs for all branches  
✅ 100GB bandwidth per month  
✅ Custom domain support  

---

Need help? Check `DEPLOYMENT.md` for detailed troubleshooting.
