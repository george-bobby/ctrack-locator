# Deploying C-Track Locator to Vercel

This guide provides step-by-step instructions for deploying the C-Track Locator application to Vercel.

## Prerequisites

1. A [Vercel](https://vercel.com/) account
2. The [Vercel CLI](https://vercel.com/docs/cli) installed (optional for GitHub deployment)
3. Git installed on your machine

## Deployment Steps

### Option 1: Deploy via GitHub Integration (Recommended)

1. **Fork or Push the Repository**
   - Ensure your code is in a GitHub repository
   - Make sure you're on the `beta` branch

2. **Connect to Vercel**
   - Log in to your Vercel account
   - Click "Add New" > "Project"
   - Select your GitHub repository
   - Configure the project:
     - Framework Preset: Next.js
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

## Troubleshooting

1. **Build Errors**
   - Check the build logs in Vercel for any errors
   - Ensure all dependencies are correctly installed

2. **API Connection Issues**
   - Verify that the backend API is running and accessible
   - Check that CORS is properly configured on the backend

3. **Environment Variables**
   - Ensure environment variables are correctly set in Vercel
   - Remember that changes to environment variables require a redeployment

## Updating the Deployment

To update your deployment after making changes:

1. **Push Changes to GitHub**
   - If using GitHub integration, Vercel will automatically redeploy

2. **Manual Redeployment**
   - If using Vercel CLI:
   ```
   vercel --prod
   ```
