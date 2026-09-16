# ⚠️ CRITICAL: YOUR ENVIRONMENT VARIABLES ARE WRONG

## 🔴 THE PROBLEM (From Your Screenshot)

You have:
- ❌ `NEXT_PUBLIC_SUPABASE_URL`
- ❌ `NEXT_PUBLIC_SUPABASE_ANON_KEY`

You need:
- ✅ `VITE_SUPABASE_URL`
- ✅ `VITE_SUPABASE_ANON_KEY`

This is a **Vite project**, NOT Next.js! Vite uses `VITE_` prefix, not `NEXT_PUBLIC_`.

---

## 🔧 FIX IT NOW (3 Minutes):

### Go to this page (you already have it open):
https://vercel.com/asacontracting/mai-parent-coaching/settings/environment-variables

---

### Step 1: Delete the Wrong Variables

1. Click on **`NEXT_PUBLIC_SUPABASE_URL`**
2. Click **"Remove"** or the trash icon
3. Confirm deletion

4. Click on **`NEXT_PUBLIC_SUPABASE_ANON_KEY`**
5. Click **"Remove"** or the trash icon
6. Confirm deletion

---

### Step 2: Add the Correct Variables

Click the **"Add Environment Variable"** button (blue button, top right)

#### Variable #1:
```
Key:   VITE_SUPABASE_URL
Value: https://qqnthevakllugdlioalm.supabase.co
```
**Environment Selection:** 
- ✅ Production
- ✅ Preview  
- ✅ Development

Click **"Save"**

---

#### Variable #2:
Click **"Add Environment Variable"** again

```
Key:   VITE_SUPABASE_ANON_KEY
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFxbnRoZXZha2xsdWdkbGlvYWxtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI1NTE2NTUsImV4cCI6MjA5ODEyNzY1NX0.v1IbgwnuK9gV_WMME1aXrmnJi19Rn2dWV5o141DxBfc
```
**Environment Selection:** 
- ✅ Production
- ✅ Preview  
- ✅ Development

Click **"Save"**

---

### Step 3: Trigger Redeploy

**Option A:** From Vercel Dashboard
1. Go to: https://vercel.com/asacontracting/mai-parent-coaching/deployments
2. Click latest deployment
3. Click three dots (•••) → "Redeploy"

**Option B:** From Terminal (I'll do this for you)
- A redeploy will be triggered automatically when you push

---

## ✅ After You Fix This

The site will work immediately after the next deployment completes (2-3 minutes).

You'll see:
- ✅ Homepage loads with full content
- ✅ Navigation works
- ✅ No blank page

---

## 📋 What You Should See in Vercel

After adding the correct variables, your Environment Variables page should show:

```
VITE_SUPABASE_URL          https://qqnthevakllugdlioalm.supabase.co     Production
VITE_SUPABASE_ANON_KEY     eyJhbGci...                                  Production
```

NOT:
```
NEXT_PUBLIC_SUPABASE_URL   (WRONG - DELETE THIS)
```

---

**DO THIS NOW - It will take 3 minutes and fix everything!**
