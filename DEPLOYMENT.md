# Deploying C-Track Locator to Vercel

This guide provides step-by-step instructions for deploying the C-Track Locator application to Vercel.

## Prerequisites

1. A [Vercel](https://vercel.com/) account
2. The [Vercel CLI](https://vercel.com/docs/cli) installed (optional for GitHub deployment)
3. Git installed on your machine

## Important Files for Deployment

1. **vercel.json** - Configuration for Vercel deployment
2. **next.config.js** - Next.js configuration with `output: 'export'` for static site generation
3. **build-static.js** - Helper script for building the static site

## Deployment Steps

### Option 1: Deploy via GitHub Integration (Recommended)

1. **Fork or Push the Repository**

   - Ensure your code is in a GitHub repository

2. **Connect to Vercel**

   - Log in to your Vercel account
   - Click "Add New" > "Project"
   - Select your GitHub repository
   - Configure the project:
     - Framework Preset: Other
     - Root Directory: ./
     - Build Command: npm run build
     - Output Directory: out

3. **Configure Environment Variables**

   - Add the following environment variable:
     - `NEXT_PUBLIC_BACKEND_URL`: `https://ctrack-locator.onrender.com/`

4. **Deploy**
   - Click "Deploy"
   - Vercel will build and deploy your application

### Option 2: Deploy via Vercel CLI

1. **Install Vercel CLI**

   ```
   npm install -g vercel
   ```

2. **Login to Vercel**

   ```
   vercel login
   ```

3. **Deploy the Project**

   ```
   vercel
   ```

4. **Follow the CLI Prompts**

   - Select your Vercel scope/account
   - Confirm the project name
   - Confirm the directory to deploy (should be the root directory)
   - When asked about framework, select "Other" instead of "Next.js"
   - Confirm that you want to override the settings with the ones in vercel.json

5. **Set Environment Variables (if not in vercel.json)**

   ```
   vercel env add NEXT_PUBLIC_BACKEND_URL
   ```

   Enter: `https://ctrack-locator.onrender.com/`

6. **Deploy to Production**
   ```
   vercel --prod
   ```

## Troubleshooting Common Issues

### Issue: Missing routes-manifest.json

If you encounter an error about missing routes-manifest.json:

1. Make sure `framework: null` is set in vercel.json (not "nextjs")
2. Add the routes configuration in vercel.json:
   ```json
   "routes": [
     { "handle": "filesystem" },
     { "src": "/(.*)", "dest": "/index.html" }
   ]
   ```

### Issue: 404 Errors on Page Refresh

If you encounter 404 errors when refreshing pages:

1. Make sure the routes configuration is correct in vercel.json
2. The fallback.html file in the public directory should help with redirects

## Important Notes

1. **Backend API**

   - The backend Flask API is already deployed at `https://ctrack-locator.onrender.com/`
   - You don't need to deploy the Flask API to Vercel

2. **Environment Variables**

   - Make sure the `NEXT_PUBLIC_BACKEND_URL` points to your deployed backend API
   - If you deploy the backend elsewhere, update this variable accordingly

3. **Static Site Generation**
   - The Next.js app is configured for static site generation (`output: 'export'` in next.config.js)
   - This means the app will be built as static HTML/CSS/JS files

## Updating the Deployment

To update your deployment after making changes:

1. **Push Changes to GitHub**

   - If using GitHub integration, Vercel will automatically redeploy

2. **Manual Redeployment**
   - If using Vercel CLI:
   ```
   vercel --prod
   ```
