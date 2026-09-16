# Vercel Deployment Guide

## 🚀 Quick Deploy Steps

### Option 1: Deploy via Vercel CLI (Recommended)

1. **Install Vercel CLI globally:**
   ```bash
   npm install -g vercel
   ```

2. **Login to your Vercel account:**
   ```bash
   vercel login
   ```

3. **Deploy the project:**
   ```bash
   vercel
   ```
   - Follow the prompts
   - Select your team: `asacontracting`
   - Confirm the project settings
   - First deployment will be a preview

4. **Deploy to production:**
   ```bash
   vercel --prod
   ```

---

### Option 2: Deploy via Vercel Dashboard (Easier)

1. **Go to:** https://vercel.com/asacontracting

2. **Click "Add New" → "Project"**

3. **Import your Git repository:**
   - Connect your GitHub/GitLab/Bitbucket account
   - Select this repository
   - Click "Import"

4. **Configure Project:**
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build` (auto-detected)
   - **Output Directory:** `dist` (auto-detected)
   - **Install Command:** `npm install` (auto-detected)

5. **Add Environment Variables:**
   Click "Environment Variables" and add these from your `.env` file:
   
   ```
   VITE_SUPABASE_URL=https://qqnthevakllugdlioalm.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFxbnRoZXZha2xsdWdkbGlvYWxtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI1NTE2NTUsImV4cCI6MjA5ODEyNzY1NX0.v1IbgwnuK9gV_WMME1aXrmnJi19Rn2dWV5o141DxBfc
   VITE_STRIPE_PUBLISHABLE_KEY=pk_your_key
   VITE_BUNNY_STREAM_LIBRARY_ID=
   VITE_BUNNY_STREAM_CDN_HOSTNAME=
   ```

6. **Click "Deploy"**

---

## 🔒 Important: Update Supabase Settings

After deployment, you MUST update your Supabase project settings:

1. **Go to:** https://supabase.com/dashboard/project/qqnthevakllugdlioalm

2. **Navigate to:** Authentication → URL Configuration

3. **Add your Vercel URLs to allowed redirect URLs:**
   - Site URL: `https://your-project-name.vercel.app`
   - Redirect URLs: 
     - `https://your-project-name.vercel.app/**`
     - `https://your-project-name.vercel.app/auth/callback`

4. **Save changes**

---

## 📝 Post-Deployment Checklist

- [ ] Site loads correctly
- [ ] Environment variables are set
- [ ] Authentication works (login/signup)
- [ ] Supabase connection is working
- [ ] All routes work (client-side routing)
- [ ] No console errors in browser
- [ ] Update Supabase allowed URLs
- [ ] Test on mobile devices
- [ ] Configure custom domain (optional)

---

## 🔄 Automatic Deployments

Once connected to Git:
- **Every push to main branch** = Production deployment
- **Every push to other branches** = Preview deployment
- **Every pull request** = Preview deployment with unique URL

---

## 🛠️ Troubleshooting

### Build Fails
- Check that all dependencies are in `package.json`
- Ensure TypeScript compiles locally: `npm run typecheck`
- Check build logs in Vercel dashboard

### Environment Variables Not Working
- Make sure they start with `VITE_`
- Redeploy after adding/changing variables
- Check they're set for Production environment

### 404 on Routes
- The `vercel.json` file handles this with rewrites
- Make sure `vercel.json` is committed to Git

### Authentication Issues
- Verify Supabase redirect URLs are set correctly
- Check that environment variables match your `.env`

---

## 📞 Support

- Vercel Docs: https://vercel.com/docs
- Vercel Community: https://github.com/vercel/vercel/discussions
- Your Dashboard: https://vercel.com/asacontracting
